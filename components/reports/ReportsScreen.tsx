import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import type { Region, Point, Machine, User, MaintenanceRecord, Part } from '../../types';
import { Role } from '../../types';
import { FileText, Filter, Printer, RefreshCw, Calendar, User as UserIcon, MapPin, Building, Coffee as CoffeeIcon, Wrench, X } from 'lucide-react';

// Define a type for the combined data
interface AllData {
    regions: Region[];
    points: Point[];
    machines: Machine[];
    users: User[];
    maintenanceRecords: MaintenanceRecord[];
    parts: Part[];
}

const ReportsScreen: React.FC = () => {
    const { user } = useAuth();
    const [allData, setAllData] = useState<AllData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        userId: '',
        regionId: user?.role === Role.TECHNICIAN ? user.regionId || '' : '',
        pointId: '',
        machineId: '',
    });
    
    const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[] | null>(null);

    // Search input states
    const [userSearch, setUserSearch] = useState('');
    const [pointSearch, setPointSearch] = useState('');
    const [machineSearch, setMachineSearch] = useState('');

    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                const result = await api.getAllDataForUser(user);
                // Ensure all parts are loaded, especially for technicians
                const allParts = await api.getAllParts();
                setAllData({ ...result, parts: allParts });
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const getEntityName = (id: string | null, type: 'user' | 'machine' | 'point' | 'region' | 'part' | 'machineWithSN') => {
        if (!id || !allData) return '';
        switch (type) {
            case 'user': return allData.users.find(u => u.id === id)?.name || '';
            case 'machine': return allData.machines.find(m => m.id === id)?.name || '';
            case 'point': return allData.points.find(p => p.id === id)?.name || '';
            case 'region': return allData.regions.find(r => r.id === id)?.name || '';
            case 'part': return allData.parts.find(p => p.id === id)?.name || '';
            case 'machineWithSN': {
                const machine = allData.machines.find(m => m.id === id);
                return machine ? `${machine.name} (SN: ${machine.serialNumber})` : '';
            }
            default: return '';
        }
    };
    
    // Sync search inputs with filter state
    useEffect(() => {
        setUserSearch(getEntityName(filters.userId, 'user'));
        setPointSearch(getEntityName(filters.pointId, 'point'));
        setMachineSearch(getEntityName(filters.machineId, 'machineWithSN'));
    }, [filters.userId, filters.pointId, filters.machineId, allData]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'regionId') {
                newFilters.pointId = '';
                newFilters.machineId = '';
            }
            if (name === 'pointId') {
                newFilters.machineId = '';
            }
            return newFilters;
        });
    };
    
    // Memoized lists for dropdowns to prevent recalculations on every render
    const { availableUsers, availableRegions, availablePoints, availableMachines } = useMemo(() => {
        if (!allData) return { availableUsers: [], availableRegions: [], availablePoints: [], availableMachines: [] };

        const availableRegions = user?.role === Role.ADMIN ? allData.regions : allData.regions.filter(r => r.id === user?.regionId);

        // Determine the base region to filter by (either the selected filter or the tech's own region)
        const effectiveRegionId = filters.regionId || (user?.role === Role.TECHNICIAN ? user.regionId : null);

        let availableUsers = allData.users.filter(u => u.role === Role.TECHNICIAN);
        let availablePoints = allData.points;
        let availableMachines = allData.machines;

        // If an effective region is determined, filter all dependent lists by it.
        if (effectiveRegionId) {
            availableUsers = availableUsers.filter(u => u.regionId === effectiveRegionId);
            availablePoints = availablePoints.filter(p => p.regionId === effectiveRegionId);
            availableMachines = availableMachines.filter(m => m.regionId === effectiveRegionId);
        }

        // If a point is selected, further filter the (already region-filtered) machines.
        if (filters.pointId) {
            availableMachines = availableMachines.filter(m => m.pointId === filters.pointId);
        }

        return { availableUsers, availableRegions, availablePoints, availableMachines };
    }, [allData, user, filters.regionId, filters.pointId]);

    const handleTextFilterChange = (
        filterName: 'userId' | 'pointId' | 'machineId',
        textValue: string
    ) => {
        if (filterName === 'userId') setUserSearch(textValue);
        if (filterName === 'pointId') setPointSearch(textValue);
        if (filterName === 'machineId') setMachineSearch(textValue);

        let selectedId = '';
        if (textValue) {
            if (filterName === 'userId') {
                selectedId = availableUsers.find(u => u.name === textValue)?.id || '';
            }
            if (filterName === 'pointId') {
                selectedId = availablePoints.find(p => p.name === textValue)?.id || '';
            }
            if (filterName === 'machineId') {
                selectedId = availableMachines.find(m => `${m.name} (SN: ${m.serialNumber})` === textValue)?.id || '';
            }
        }
        
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: selectedId };
            if (filterName === 'pointId' && !selectedId) {
                newFilters.machineId = ''; // Clear machine if point is cleared
            }
            return newFilters;
        });
    };

    const handleGenerateReport = () => {
        if (!allData) return;

        let records = allData.maintenanceRecords;

        // Date filtering
        if (filters.startDate) {
            const startDate = new Date(`${filters.startDate}T00:00:00`);
            records = records.filter(r => new Date(r.timestamp) >= startDate);
        }
        if (filters.endDate) {
            const endDate = new Date(`${filters.endDate}T23:59:59`);
            records = records.filter(r => new Date(r.timestamp) <= endDate);
        }

        // User filtering
        if (filters.userId) {
            records = records.filter(r => r.userId === filters.userId);
        }

        // Machine, Point, Region filtering (hierarchical)
        let machineIdsToFilter: Set<string> | null = null;

        if (filters.machineId) {
            machineIdsToFilter = new Set([filters.machineId]);
        } else if (filters.pointId) {
            machineIdsToFilter = new Set(allData.machines.filter(m => m.pointId === filters.pointId).map(m => m.id));
        } else if (filters.regionId) {
            machineIdsToFilter = new Set(allData.machines.filter(m => m.regionId === filters.regionId).map(m => m.id));
        }

        if (machineIdsToFilter) {
            records = records.filter(r => machineIdsToFilter!.has(r.machineId));
        }
        
        setFilteredRecords(records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            userId: '',
            regionId: user?.role === Role.TECHNICIAN ? user.regionId || '' : '',
            pointId: '',
            machineId: '',
        });
        setFilteredRecords(null);
    };

    const handlePrint = () => {
        window.print();
    };
    
    const getMachineInfo = (machineId: string) => {
        const machine = allData?.machines.find(m => m.id === machineId);
        if (!machine) return { name: 'N/A', sn: 'N/A', point: 'N/A', region: 'N/A' };
        return {
            name: machine.name,
            sn: machine.serialNumber,
            point: getEntityName(machine.pointId, 'point') || 'Без привязки',
            region: getEntityName(machine.regionId, 'region'),
        }
    }


    if (loading) {
        return (
            <div className="flex justify-center items-center mt-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
        );
    }
    
    const inputClasses = "block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";
    
    return (
        <div className="container mx-auto max-w-6xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary mb-4 sm:mb-6 flex items-center gap-3 no-print">
                <FileText className="w-8 h-8"/>
                Формирование отчётов
            </h1>

            <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md mb-6 no-print">
                 <h2 className="text-xl font-bold text-brand-primary mb-4 flex items-center gap-2"><Filter className="w-5 h-5"/>Параметры отчёта</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date Filters */}
                    <div className="cursor-pointer" onClick={() => startDateRef.current?.showPicker()}>
                        <label htmlFor="startDate" className="block text-sm font-medium text-brand-primary">Начало периода</label>
                        <input
                            ref={startDateRef}
                            id="startDate"
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            onKeyDown={(e) => e.preventDefault()}
                            className={inputClasses}
                        />
                    </div>
                    <div className="cursor-pointer" onClick={() => endDateRef.current?.showPicker()}>
                        <label htmlFor="endDate" className="block text-sm font-medium text-brand-primary">Конец периода</label>
                        <input
                            ref={endDateRef}
                            id="endDate"
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            onKeyDown={(e) => e.preventDefault()}
                            className={inputClasses}
                        />
                    </div>

                    {/* User Filter */}
                    <div>
                        <label htmlFor="userInput" className="block text-sm font-medium text-brand-primary">Пользователь</label>
                        <div className="relative">
                            <input
                                id="userInput"
                                type="text"
                                list="users-datalist"
                                value={userSearch}
                                onChange={(e) => handleTextFilterChange('userId', e.target.value)}
                                className={`${inputClasses} pr-8`}
                                placeholder="Все пользователи"
                            />
                            {userSearch && (
                                <button
                                    type="button"
                                    onClick={() => handleTextFilterChange('userId', '')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                                    aria-label="Очистить"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <datalist id="users-datalist">
                                {availableUsers.map(u => <option key={u.id} value={u.name} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Region Filter (Admin only) */}
                    {user?.role === Role.ADMIN && (
                        <div>
                            <label htmlFor="regionId" className="block text-sm font-medium text-brand-primary">Регион</label>
                            <select id="regionId" name="regionId" value={filters.regionId} onChange={handleFilterChange} className={inputClasses}>
                                <option value="">Все регионы</option>
                                {availableRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Point Filter */}
                    <div>
                        <label htmlFor="pointInput" className="block text-sm font-medium text-brand-primary">Точка</label>
                         <div className="relative">
                            <input
                                id="pointInput"
                                type="text"
                                list="points-datalist"
                                value={pointSearch}
                                onChange={(e) => handleTextFilterChange('pointId', e.target.value)}
                                className={`${inputClasses} pr-8`}
                                placeholder="Все точки"
                                disabled={!filters.regionId && user?.role === Role.ADMIN}
                            />
                            {pointSearch && (
                                <button
                                    type="button"
                                    onClick={() => handleTextFilterChange('pointId', '')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                                    aria-label="Очистить"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <datalist id="points-datalist">
                                {availablePoints.map(p => <option key={p.id} value={p.name} />)}
                            </datalist>
                        </div>
                    </div>

                     {/* Machine Filter */}
                    <div>
                        <label htmlFor="machineInput" className="block text-sm font-medium text-brand-primary">Аппарат</label>
                        <div className="relative">
                            <input
                                id="machineInput"
                                type="text"
                                list="machines-datalist"
                                value={machineSearch}
                                onChange={(e) => handleTextFilterChange('machineId', e.target.value)}
                                className={`${inputClasses} pr-8`}
                                placeholder="Все аппараты"
                                disabled={availableMachines.length === 0}
                            />
                            {machineSearch && (
                                <button
                                    type="button"
                                    onClick={() => handleTextFilterChange('machineId', '')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                                    aria-label="Очистить"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <datalist id="machines-datalist">
                                {availableMachines.map(m => <option key={m.id} value={`${m.name} (SN: ${m.serialNumber})`} />)}
                            </datalist>
                        </div>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-3 mt-6 justify-end">
                    <button onClick={handleClearFilters} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors">
                        <RefreshCw className="w-4 h-4"/> Сбросить
                    </button>
                    <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold transition-colors shadow-sm">
                        <FileText className="w-4 h-4"/> Сформировать отчёт
                    </button>
                 </div>
            </div>

            {filteredRecords && (
                <div id="report-area">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-brand-primary">Результаты отчёта</h2>
                        <button onClick={handlePrint} className="no-print flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-primary font-semibold transition-colors">
                            <Printer className="w-5 h-5"/> Печать
                        </button>
                    </div>

                    {filteredRecords.length > 0 ? (
                        <div className="space-y-4">
                            {filteredRecords.map(record => {
                                const machineInfo = getMachineInfo(record.machineId);
                                return (
                                    <div key={record.id} className="p-4 bg-white rounded-lg shadow-md border border-gray-200 report-record">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                            <div className="md:col-span-1">
                                                <p className="flex items-center gap-2 font-semibold text-brand-primary"><Calendar className="w-4 h-4 text-gray-500"/>Дата: {new Date(record.timestamp).toLocaleString('ru-RU')}</p>
                                                <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-gray-500"/>Техник: {getEntityName(record.userId, 'user')}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <p className="flex items-center gap-2 font-semibold text-brand-primary"><CoffeeIcon className="w-4 h-4 text-gray-500"/>Аппарат: {machineInfo.name} <span className="text-gray-400 font-normal">(SN: {machineInfo.sn})</span></p>
                                                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500"/>Расположение: {machineInfo.point}, {machineInfo.region}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <p className="text-brand-primary">{record.description}</p>
                                            {record.usedParts.length > 0 && (
                                                <div className="mt-2">
                                                    <h4 className="font-semibold text-sm flex items-center gap-2 text-brand-primary/80"><Wrench className="w-4 h-4"/>Запчасти:</h4>
                                                    <ul className="list-disc list-inside ml-2 mt-1 text-sm text-gray-700 space-y-1">
                                                        {record.usedParts.map(p => (
                                                            <li key={p.partId}>{getEntityName(p.partId, 'part')} (x{p.quantity})</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="p-6 bg-white rounded-lg shadow text-center text-gray-600">
                            <p>По заданным критериям ничего не найдено.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportsScreen;