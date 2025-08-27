import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnlineStatus } from '../../contexts/OnlineStatusContext';
import * as api from '../../services/api';
import type { Region, Point, Machine, User, MaintenanceRecord } from '../../types';
import { MachineStatus } from '../../types';
import { Search, MapPin, Building, Coffee as CoffeeIcon, ChevronDown, ChevronRight, Calendar, WifiOff } from 'lucide-react';

const MachineLink = ({ machine, lastRecordInfo }: { machine: Machine, lastRecordInfo: string }) => {
    const statusColors: Record<MachineStatus, string> = {
        [MachineStatus.OK]: 'text-status-ok',
        [MachineStatus.WARNING]: 'text-status-warning',
        [MachineStatus.ERROR]: 'text-status-error',
    };

    return (
        <Link to={`/machine/${machine.id}`} className="block p-2 rounded-md hover:bg-brand-light transition-colors group">
            <div className="flex items-start gap-2">
                <CoffeeIcon className={`w-4 h-4 ${statusColors[machine.status] || 'text-brand-secondary'} group-hover:text-brand-primary flex-shrink-0 mt-1`} />
                <div className="flex-grow">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium group-hover:text-brand-primary">{machine.name}</span>
                        <span className="text-sm text-gray-400 whitespace-nowrap">(SN: {machine.serialNumber})</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3"/>
                        <span>{lastRecordInfo}</span>
                    </p>
                </div>
            </div>
        </Link>
    );
};


const DashboardScreen: React.FC = () => {
    const { user } = useAuth();
    const { isOnline } = useOnlineStatus();
    const [data, setData] = useState<{ 
        regions: Region[], 
        points: Point[], 
        machines: Machine[],
        users: User[],
        maintenanceRecords: MaintenanceRecord[]
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<MachineStatus | ''>('');
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

    // Effect for fetching data
    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                setError(null);
                try {
                    const result = await api.getAllDataForUser();
                    setData(result);
                } catch (e: any) {
                    setError('Не удалось загрузить данные. Проверьте подключение к сети.');
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    // Effect for managing region expansion based on filters
    useEffect(() => {
        if (!data) return;
        const lowerSearchTerm = searchTerm.toLowerCase().trim();

        if (lowerSearchTerm || statusFilter) {
            const newlyExpanded = new Set<string>();
            data.regions.forEach(region => {
                // Check if any machine in the region matches the combined filters
                const hasMatchingMachine = data.machines.some(machine => {
                    if (machine.regionId !== region.id) return false;
                    
                    const statusMatch = !statusFilter || machine.status === statusFilter;
                    if (!statusMatch) return false;

                    if (lowerSearchTerm) {
                        const machineItselfMatches = machine.name.toLowerCase().includes(lowerSearchTerm) || machine.serialNumber.toLowerCase().includes(lowerSearchTerm);
                        if (machineItselfMatches) return true;

                        const point = machine.pointId ? data.points.find(p => p.id === machine.pointId) : null;
                        if (point) {
                            return point.name.toLowerCase().includes(lowerSearchTerm) || point.address.toLowerCase().includes(lowerSearchTerm);
                        }
                    } else {
                        return true; // No search term, status match is enough
                    }
                    
                    return false;
                });
                
                if (hasMatchingMachine) {
                    newlyExpanded.add(region.id);
                }
            });
            setExpandedRegions(newlyExpanded);
        } else {
            // Default expansion logic when filters are empty
            if (user && (user.role === 'TECHNICIAN' || data.regions.length === 1)) {
                setExpandedRegions(new Set(data.regions.map((r: Region) => r.id)));
            } else {
                setExpandedRegions(new Set());
            }
        }
    }, [searchTerm, statusFilter, data, user]);


    const toggleRegion = (regionId: string) => {
        setExpandedRegions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(regionId)) {
                newSet.delete(regionId);
            } else {
                newSet.add(regionId);
            }
            return newSet;
        });
    };

    let hasResults = false;
    
    const getLastRecordInfo = (machineId: string) => {
        if (!data) return 'Загрузка...';

        const lastRecord = data.maintenanceRecords
            .filter(r => r.machineId === machineId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        if (lastRecord) {
            const userName = data.users.find(u => u.id === lastRecord.userId)?.name || 'Неизвестный';
            const recordDate = new Date(lastRecord.timestamp).toLocaleDateString('ru-RU');
            return `${recordDate} (${userName})`;
        }

        return 'Нет записей об обслуживании';
    };


    return (
        <div className="container mx-auto max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary mb-4 sm:mb-6">Панель мониторинга</h1>
            
            {!isOnline && (
                <div className="p-3 mb-6 bg-status-warning/20 border-l-4 border-status-warning text-yellow-800 rounded-r-lg flex items-center gap-3">
                    <WifiOff className="w-6 h-6"/>
                    <div>
                        <p className="font-bold">Вы работаете в офлайн-режиме.</p>
                        <p className="text-sm">Отображаются сохраненные данные, они могут быть неактуальны.</p>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Поиск по точке, адресу, аппарату..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white text-brand-primary placeholder-gray-500"
                    />
                </div>
                 <div className="sm:w-auto sm:min-w-[200px]">
                    <select
                        id="statusFilter"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as MachineStatus | '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white text-brand-primary"
                        aria-label="Фильтр по статусу"
                    >
                        <option value="">Все статусы</option>
                        <option value={MachineStatus.OK}>В работе</option>
                        <option value={MachineStatus.WARNING}>Требует внимания</option>
                        <option value={MachineStatus.ERROR}>Неисправен</option>
                    </select>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center items-center mt-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
            )}
            
            {error && !data && (
                <div className="text-center p-6 bg-white rounded-lg shadow-md">
                    <p className="text-status-error">{error}</p>
                </div>
            )}


            {!loading && data && (
                <div className="space-y-4">
                    {data.regions.map(region => {
                        const lowerSearchTerm = searchTerm.toLowerCase().trim();
                        
                        const pointsInRegion = data.points.filter(p => p.regionId === region.id);
                        const machinesWithoutPoint = data.machines.filter(m => m.regionId === region.id && !m.pointId);

                        // Filter unassigned machines. They must match both status and search.
                        const filteredMachinesWithoutPoint = machinesWithoutPoint.filter(m => {
                            const statusMatch = !statusFilter || m.status === statusFilter;
                            if (!statusMatch) return false;
                            if (lowerSearchTerm) {
                                return m.name.toLowerCase().includes(lowerSearchTerm) || m.serialNumber.toLowerCase().includes(lowerSearchTerm);
                            }
                            return true;
                        });

                        // For points, we need to find which points should be displayed, and for each of those points, which machines should be displayed.
                        const displayablePoints = pointsInRegion.map(point => {
                            const machinesInPoint = data.machines.filter(m => m.pointId === point.id);

                            // Filter the machines that will be displayed under this point.
                            const displayableMachinesInPoint = machinesInPoint.filter(m => {
                                const statusMatch = !statusFilter || m.status === statusFilter;
                                if (!statusMatch) return false;
                                
                                if (lowerSearchTerm) {
                                    const machineMatch = m.name.toLowerCase().includes(lowerSearchTerm) || m.serialNumber.toLowerCase().includes(lowerSearchTerm);
                                    const pointMatch = point.name.toLowerCase().includes(lowerSearchTerm) || point.address.toLowerCase().includes(lowerSearchTerm);
                                    return machineMatch || pointMatch;
                                }
                                return true;
                            });

                            return { point, machines: displayableMachinesInPoint };
                        }).filter(item => item.machines.length > 0);
                        
                        if (displayablePoints.length === 0 && filteredMachinesWithoutPoint.length === 0) {
                            return null;
                        }

                        hasResults = true;

                        return (
                            <div key={region.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300">
                                <div
                                    className="p-4 bg-brand-accent flex justify-between items-center cursor-pointer hover:bg-opacity-80"
                                    onClick={() => toggleRegion(region.id)}
                                    aria-expanded={expandedRegions.has(region.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-6 h-6 text-brand-primary" />
                                        <h2 className="text-xl font-bold text-brand-primary">{region.name}</h2>
                                    </div>
                                    {expandedRegions.has(region.id) ? <ChevronDown className="w-6 h-6 text-brand-primary" /> : <ChevronRight className="w-6 h-6 text-brand-primary" />}
                                </div>

                                {expandedRegions.has(region.id) && (
                                    <div className="p-4 border-t border-gray-200 animate-fade-in">
                                        {displayablePoints.map(({ point, machines }) => (
                                            <div key={point.id} className="mb-4 pl-4 border-l-2 border-brand-secondary">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Building className="w-5 h-5 text-gray-600" />
                                                    <div>
                                                        <h3 className="text-lg font-semibold">{point.name}</h3>
                                                        <p className="text-sm text-gray-500">{point.address}</p>
                                                    </div>
                                                </div>
                                                <div className="pl-6 space-y-1">
                                                    {machines.map(machine => <MachineLink key={machine.id} machine={machine} lastRecordInfo={getLastRecordInfo(machine.id)} />)}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {filteredMachinesWithoutPoint.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-dashed">
                                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Аппараты без привязки к точке</h3>
                                                <div className="pl-6 space-y-1">
                                                    {filteredMachinesWithoutPoint.map(machine => <MachineLink key={machine.id} machine={machine} lastRecordInfo={getLastRecordInfo(machine.id)} />)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {!loading && !hasResults && (
                        <div className="text-center p-6 bg-white rounded-lg shadow-md">
                            <p className="text-gray-600">По вашему запросу ничего не найдено.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardScreen;
