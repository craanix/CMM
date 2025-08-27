import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import type { Region, Point, Machine, User, MaintenanceRecord } from '../../types';
import { MachineStatus } from '../../types';
import { Search, MapPin, Building, Coffee as CoffeeIcon, ChevronDown, ChevronRight, Calendar, User as UserIcon } from 'lucide-react';

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
    const [data, setData] = useState<{ 
        regions: Region[], 
        points: Point[], 
        machines: Machine[],
        users: User[],
        maintenanceRecords: MaintenanceRecord[]
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

    // Effect for fetching data
    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                setLoading(true);
                const result = await api.getAllDataForUser(user);
                setData(result);
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // Effect for managing region expansion based on search and user role
    useEffect(() => {
        if (!data) return;
        const lowerSearchTerm = searchTerm.toLowerCase().trim();

        if (lowerSearchTerm) {
            const newlyExpanded = new Set<string>();
            data.regions.forEach(region => {
                const pointsInRegion = data.points.filter(p => p.regionId === region.id);
                const hasMatchingPoint = pointsInRegion.some(point => {
                    const pointItselfMatches = point.name.toLowerCase().includes(lowerSearchTerm) || point.address.toLowerCase().includes(lowerSearchTerm);
                    if (pointItselfMatches) return true;

                    const machinesInPoint = data.machines.filter(m => m.pointId === point.id);
                    return machinesInPoint.some(m => m.name.toLowerCase().includes(lowerSearchTerm) || m.serialNumber.toLowerCase().includes(lowerSearchTerm));
                });
                
                const machinesWithoutPoint = data.machines.filter(m => m.regionId === region.id && !m.pointId);
                const hasMatchingMachineWithoutPoint = machinesWithoutPoint.some(m => m.name.toLowerCase().includes(lowerSearchTerm) || m.serialNumber.toLowerCase().includes(lowerSearchTerm));
                
                if (hasMatchingPoint || hasMatchingMachineWithoutPoint) {
                    newlyExpanded.add(region.id);
                }
            });
            setExpandedRegions(newlyExpanded);
        } else {
            // Default expansion logic when search is empty
            if (user && (user.role === 'TECHNICIAN' || data.regions.length === 1)) {
                setExpandedRegions(new Set(data.regions.map((r: Region) => r.id)));
            } else {
                setExpandedRegions(new Set());
            }
        }
    }, [searchTerm, data, user]);


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
            
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Поиск по точке, адресу, аппарату..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white text-brand-primary placeholder-gray-500"
                />
            </div>

            {loading && (
                <div className="flex justify-center items-center mt-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                </div>
            )}

            {!loading && data && (
                <div className="space-y-4">
                    {data.regions.map(region => {
                        const lowerSearchTerm = searchTerm.toLowerCase().trim();
                        
                        const pointsInRegion = data.points.filter(p => p.regionId === region.id);
                        const machinesWithoutPoint = data.machines.filter(m => m.regionId === region.id && !m.pointId);

                        let filteredPoints = pointsInRegion;
                        let filteredMachinesWithoutPoint = machinesWithoutPoint;

                        if (lowerSearchTerm) {
                            filteredPoints = pointsInRegion.filter(point => {
                                const pointItselfMatches = point.name.toLowerCase().includes(lowerSearchTerm) || point.address.toLowerCase().includes(lowerSearchTerm);
                                if (pointItselfMatches) return true;
                                
                                const machinesInPoint = data.machines.filter(m => m.pointId === point.id);
                                return machinesInPoint.some(m => m.name.toLowerCase().includes(lowerSearchTerm) || m.serialNumber.toLowerCase().includes(lowerSearchTerm));
                            });

                            filteredMachinesWithoutPoint = machinesWithoutPoint.filter(m => m.name.toLowerCase().includes(lowerSearchTerm) || m.serialNumber.toLowerCase().includes(lowerSearchTerm));
                        }
                        
                        if (filteredPoints.length === 0 && filteredMachinesWithoutPoint.length === 0) {
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
                                        {filteredPoints.map(point => {
                                            const machinesInPoint = data.machines.filter(m => m.pointId === point.id);
                                            return (
                                                <div key={point.id} className="mb-4 pl-4 border-l-2 border-brand-secondary">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Building className="w-5 h-5 text-gray-600" />
                                                        <div>
                                                            <h3 className="text-lg font-semibold">{point.name}</h3>
                                                            <p className="text-sm text-gray-500">{point.address}</p>
                                                        </div>
                                                    </div>
                                                    <div className="pl-6 space-y-1">
                                                        {machinesInPoint.map(machine => <MachineLink key={machine.id} machine={machine} lastRecordInfo={getLastRecordInfo(machine.id)} />)}
                                                        {machinesInPoint.length === 0 && <p className="text-sm text-gray-400 italic">Нет аппаратов на этой точке</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {filteredMachinesWithoutPoint.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-dashed">
                                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Аппараты без привязки к точке</h3>
                                                <div className="pl-6 space-y-1">
                                                    {filteredMachinesWithoutPoint.map(machine => <MachineLink key={machine.id} machine={machine} lastRecordInfo={getLastRecordInfo(machine.id)} />)}
                                                </div>
                                            </div>
                                        )}

                                        {filteredPoints.length === 0 && filteredMachinesWithoutPoint.length === 0 && (
                                            <p className="text-center text-gray-500 py-4">В этом регионе нет точек или аппаратов.</p>
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