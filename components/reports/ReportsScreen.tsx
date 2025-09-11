
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import type { Region, Point, Machine, User, MaintenanceRecord, Part } from '../../types';
import { Role } from '../../types';
import { FileText, Filter, Printer, RefreshCw, Calendar, User as UserIcon, MapPin, Building, Coffee as CoffeeIcon, Wrench, ChevronDown } from 'lucide-react';

// Define a type for the combined data
interface AllData {
    regions: Region[];
    points: Point[];
    machines: Machine[];
    users: User[];
    maintenanceRecords: MaintenanceRecord[];
    parts: Part[];
}

interface PartsReportData {
    sku: string;
    name: string;
    quantity: number;
}

// --- Reusable Searchable Dropdown Component ---

interface Option {
    id: string;
    name: string;
}

interface SearchableDropdownProps {
    label: string;
    options: Option[];
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    label,
    options,
    selectedId,
    onSelect,
    placeholder = 'Выберите...',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => options.find(opt => opt.id === selectedId), [options, selectedId]);

    useEffect(() => {
        setSearchTerm(selectedOption?.name || '');
    }, [selectedOption]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(selectedOption?.name || '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [wrapperRef, selectedOption]);

    const filteredOptions = useMemo(() => {
        if (searchTerm === selectedOption?.name) {
             return options;
        }
        return options.filter(option =>
            option.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm, selectedOption]);

    const handleSelect = (option: Option) => {
        onSelect(option.id);
        setSearchTerm(option.name);
        setIsOpen(false);
    };

    const inputClasses = "block w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed";

    return (
        <div ref={wrapperRef} className="relative">
            <label htmlFor={label} className="block text-sm font-medium text-brand-primary">{label}</label>
            <div className="mt-1 relative">
                <input
                    id={label}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                        if (e.target.value === '') {
                           onSelect('');
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={inputClasses}
                    disabled={disabled}
                    autoComplete="off"
                />
                 <button type="button" onClick={() => setIsOpen(!isOpen)} disabled={disabled} className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} aria-hidden="true" />
                </button>
            </div>

            {isOpen && !disabled && (
                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <li
                                key={option.id}
                                onClick={() => handleSelect(option)}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-brand-primary hover:bg-brand-accent ${option.id === selectedId ? 'bg-brand-accent' : ''}`}
                            >
                                {option.name}
                            </li>
                        ))
                    ) : (
                        <li className="select-none relative py-2 px-4 text-gray-500">
                            Ничего не найдено
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};


const ReportsScreen: React.FC = () => {
    const { user } = useAuth();
    const [allData, setAllData] = useState<AllData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        userId: '',
        regionId: '',
        pointId: '',
        machineId: '',
    });
    
    const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[] | null>(null);
    const [partsOnlyReport, setPartsOnlyReport] = useState(false);
    const [partsReportData, setPartsReportData] = useState<PartsReportData[] | null>(null);


    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                const result = await api.getAllDataForUser();
                const allParts = await api.getAllParts();
                setAllData({ ...result, parts: allParts });
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    useEffect(() => {
        setFilteredRecords(null);
        setPartsReportData(null);
    }, [partsOnlyReport]);

    const getEntityName = (id: string | null, type: 'user' | 'machine' | 'point' | 'region' | 'part') => {
        if (!id || !allData) return '';
        switch (type) {
            case 'user': return allData.users.find(u => u.id === id)?.name || '';
            case 'machine': 
                const machine = allData.machines.find(m => m.id === id);
                return machine ? `${machine.name} (SN: ${machine.serialNumber})` : '';
            case 'point': return allData.points.find(p => p.id === id)?.name || '';
            case 'region': return allData.regions.find(r => r.id === id)?.name || '';
            case 'part': return allData.parts.find(p => p.id === id)?.name || '';
            default: return '';
        }
    };

    const { availableUsers, availableRegions, availablePoints, availableMachines } = useMemo(() => {
        if (!allData) return { availableUsers: [], availableRegions: [], availablePoints: [], availableMachines: [] };
        
        // For technicians, allData is pre-filtered by the API. For admins, it's all data.
        const availableRegions = allData.regions;

        let availableUsers = allData.users.filter(u => u.role === Role.TECHNICIAN);
        let availablePoints = allData.points;
        let availableMachines = allData.machines;
        
        if (filters.regionId) {
            availableUsers = availableUsers.filter(u => u.regions.some(r => r.id === filters.regionId));
            availablePoints = availablePoints.filter(p => p.regionId === filters.regionId);
            availableMachines = availableMachines.filter(m => m.regionId === filters.regionId);
        }

        if (filters.pointId) {
            availableMachines = availableMachines.filter(m => m.pointId === filters.pointId);
        }

        return { availableUsers, availableRegions, availablePoints, availableMachines };
    }, [allData, user, filters.regionId, filters.pointId]);

    const userOptions = useMemo(() => availableUsers.map(u => ({ id: u.id, name: u.name })), [availableUsers]);
    const pointOptions = useMemo(() => availablePoints.map(p => ({ id: p.id, name: p.name })), [availablePoints]);
    const machineOptions = useMemo(() => availableMachines.map(m => ({ id: m.id, name: `${m.name} (SN: ${m.serialNumber})` })), [availableMachines]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'regionId') {
                newFilters.pointId = '';
                newFilters.machineId = '';
                newFilters.userId = '';
            }
             if (name === 'pointId') {
                newFilters.machineId = '';
            }
            return newFilters;
        });
    };

    const handleGenerateReport = () => {
        if (!allData) return;
        setFilteredRecords(null);
        setPartsReportData(null);

        let records = allData.maintenanceRecords;
        if (filters.startDate) {
            const startDate = new Date(`${filters.startDate}T00:00:00`);
            records = records.filter(r => new Date(r.timestamp) >= startDate);
        }
        if (filters.endDate) {
            const endDate = new Date(`${filters.endDate}T23:59:59`);
            records = records.filter(r => new Date(r.timestamp) <= endDate);
        }

        if (partsOnlyReport) {
            if (filters.regionId) {
                const machineIdsInRegion = new Set(allData.machines.filter(m => m.regionId === filters.regionId).map(m => m.id));
                records = records.filter(r => machineIdsInRegion.has(r.machineId));
            }
            
            const aggregatedParts = new Map<string, PartsReportData>();
            for (const record of records) {
                for (const usedPart of record.usedParts) {
                    const existingPart = aggregatedParts.get(usedPart.partId);
                    if (existingPart) {
                        existingPart.quantity += usedPart.quantity;
                    } else {
                        const partInfo = allData.parts.find(p => p.id === usedPart.partId);
                        if (partInfo) {
                            aggregatedParts.set(usedPart.partId, {
                                sku: partInfo.sku,
                                name: partInfo.name,
                                quantity: usedPart.quantity,
                            });
                        }
                    }
                }
            }
            const sortedPartsReport = Array.from(aggregatedParts.values()).sort((a, b) => a.name.localeCompare(b.name));
            setPartsReportData(sortedPartsReport);

        } else {
            if (filters.userId) {
                records = records.filter(r => r.userId === filters.userId);
            }
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
        }
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            userId: '',
            regionId: '',
            pointId: '',
            machineId: '',
        });
        setFilteredRecords(null);
        setPartsOnlyReport(false);
        setPartsReportData(null);
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
    
    const generateReportSummary = (): string => {
        if (!filteredRecords && !partsReportData) return '';
        
        const parts: string[] = [];
        if (filters.startDate) parts.push(`с ${new Date(filters.startDate).toLocaleDateString('ru-RU')}`);
        if (filters.endDate) parts.push(`по ${new Date(filters.endDate).toLocaleDateString('ru-RU')}`);
        if (filters.regionId) parts.push(`регион: "${getEntityName(filters.regionId, 'region')}"`);

        if (partsOnlyReport) {
            if (parts.length === 0) return 'Показаны все использованные запчасти';
            return `Фильтры: ${parts.join(', ')}`;
        }
        
        if (filters.pointId) parts.push(`точка: "${getEntityName(filters.pointId, 'point')}"`);
        if (filters.machineId) parts.push(`аппарат: "${getEntityName(filters.machineId, 'machine')}"`);
        if (filters.userId) parts.push(`техник: "${getEntityName(filters.userId, 'user')}"`);
        
        if (parts.length === 0) return 'Показаны все записи';
    
        return `Фильтры: ${parts.join(', ')}`;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center mt-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
        );
    }
    
    const inputClasses = "block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed";
    
    return (
        <div className="container mx-auto max-w-6xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary mb-4 sm:mb-6 flex items-center gap-3 no-print">
                <FileText className="w-8 h-8"/>
                Формирование отчётов
            </h1>

            <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md mb-6 no-print">
                 <h2 className="text-xl font-bold text-brand-primary mb-4 flex items-center gap-2"><Filter className="w-5 h-5"/>Параметры отчёта</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="cursor-pointer" onClick={() => startDateRef.current?.showPicker()}>
                        <label htmlFor="startDate" className="block text-sm font-medium text-brand-primary">Начало периода</label>
                        <input ref={startDateRef} id="startDate" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} onKeyDown={(e) => e.preventDefault()} className={inputClasses}/>
                    </div>
                    <div className="cursor-pointer" onClick={() => endDateRef.current?.showPicker()}>
                        <label htmlFor="endDate" className="block text-sm font-medium text-brand-primary">Конец периода</label>
                        <input ref={endDateRef} id="endDate" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} onKeyDown={(e) => e.preventDefault()} className={inputClasses}/>
                    </div>
                     <div className="flex items-center self-end pb-1.5">
                        <input type="checkbox" id="partsOnly" checked={partsOnlyReport} onChange={(e) => setPartsOnlyReport(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-secondary" />
                        <label htmlFor="partsOnly" className="ml-2 block text-sm font-medium text-brand-primary">Только запчасти</label>
                     </div>

                    <div>
                        <label htmlFor="regionId" className="block text-sm font-medium text-brand-primary">Регион</label>
                        <select id="regionId" name="regionId" value={filters.regionId} onChange={handleFilterChange} className={inputClasses}>
                            <option value="">Все регионы</option>
                            {availableRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>

                    <SearchableDropdown
                        label="Пользователь"
                        options={userOptions}
                        selectedId={filters.userId}
                        onSelect={(id) => setFilters(prev => ({ ...prev, userId: id }))}
                        placeholder="Все пользователи"
                        disabled={partsOnlyReport}
                    />
                     <SearchableDropdown
                        label="Точка"
                        options={pointOptions}
                        selectedId={filters.pointId}
                        onSelect={(id) => handleFilterChange({ target: { name: 'pointId', value: id } } as any)}
                        placeholder="Все точки"
                        disabled={partsOnlyReport || (!filters.regionId && user?.role === Role.ADMIN && availableRegions.length > 1)}
                    />
                    <SearchableDropdown
                        label="Аппарат"
                        options={machineOptions}
                        selectedId={filters.machineId}
                        onSelect={(id) => setFilters(prev => ({ ...prev, machineId: id }))}
                        placeholder="Все аппараты"
                        disabled={partsOnlyReport || availableMachines.length === 0}
                    />
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

            {!filteredRecords && !partsReportData && (
                <div className="mt-6 p-6 bg-white rounded-lg shadow-md text-center text-gray-500 border-2 border-dashed border-gray-300 no-print">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2"/>
                    <h3 className="text-lg font-semibold text-brand-primary">Отчёт готов к формированию</h3>
                    <p>Используйте фильтры выше, чтобы задать параметры, а затем нажмите "Сформировать отчёт".</p>
                </div>
            )}

            {(filteredRecords || partsReportData) && (
                <div id="report-area" className="mt-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-brand-primary">
                                {partsOnlyReport ? `Отчёт по запчастям (${partsReportData?.length || 0})` : `Результаты отчёта (${filteredRecords?.length || 0})`}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">{generateReportSummary()}</p>
                        </div>
                        {((filteredRecords && filteredRecords.length > 0) || (partsReportData && partsReportData.length > 0)) && (
                            <button onClick={handlePrint} className="no-print self-start sm:self-center flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-primary font-semibold transition-colors">
                                <Printer className="w-5 h-5"/> Печать
                            </button>
                        )}
                    </div>

                    {partsOnlyReport ? (
                        partsReportData && partsReportData.length > 0 ? (
                            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                                <table className="min-w-full bg-white">
                                    <thead className="bg-brand-accent/60">
                                        <tr>
                                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Артикул</th>
                                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Название</th>
                                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Количество</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {partsReportData.map((part, index) => (
                                            <tr key={index} className="hover:bg-gray-50/70">
                                                <td className="p-3 font-mono text-sm text-gray-700">{part.sku}</td>
                                                <td className="p-3 font-medium text-brand-primary">{part.name}</td>
                                                <td className="p-3 font-semibold text-brand-primary">{part.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                             <div className="p-6 bg-white rounded-lg shadow text-center text-gray-600">
                                <p>Запчасти за выбранный период не использовались.</p>
                            </div>
                        )
                    ) : (
                        filteredRecords && filteredRecords.length > 0 ? (
                            <div className="space-y-4">
                                {filteredRecords.map(record => {
                                    const machineInfo = getMachineInfo(record.machineId);
                                    return (
                                        <div key={record.id} className="p-4 bg-white rounded-lg shadow-md border border-gray-200 report-record border-l-4 border-brand-secondary">
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
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportsScreen;
