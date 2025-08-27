
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../../services/api';
import type { Machine, Region, Point, User } from '../../types';
import { Role, MachineStatus } from '../../types';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';

const StatusBadge: React.FC<{ status: MachineStatus }> = ({ status }) => {
    const statusStyles: Record<MachineStatus, { text: string; bg: string; textColor: string; }> = {
        [MachineStatus.OK]: { text: 'В работе', bg: 'bg-status-ok/10', textColor: 'text-status-ok' },
        [MachineStatus.WARNING]: { text: 'Требует внимания', bg: 'bg-status-warning/10', textColor: 'text-status-warning' },
        [MachineStatus.ERROR]: { text: 'Неисправен', bg: 'bg-status-error/10', textColor: 'text-status-error' },
    };
    const style = statusStyles[status] || statusStyles.OK;
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style.bg} ${style.textColor} inline-block`}>
            {style.text}
        </span>
    );
};

const MachineManagement: React.FC = () => {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [points, setPoints] = useState<Point[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<MachineStatus | ''>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        // FIX: api.getAllDataForUser expects 0 arguments. Admin role is inferred from auth token on the server.
        const allData = await api.getAllDataForUser();
        setMachines(allData.machines);
        setRegions(allData.regions);
        setPoints(allData.points);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (machine: Machine | null = null) => {
        setCurrentMachine(machine);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentMachine(null);
    };

    const handleSaveMachine = async (machineToSave: Omit<Machine, 'id'> | Machine) => {
        if ('id' in machineToSave) {
            await api.updateEntity('machines', machineToSave);
        } else {
            await api.addEntity('machines', machineToSave);
        }
        fetchData();
        handleCloseModal();
    };

    const handleDeleteMachine = async (machineId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этот аппарат?')) {
            await api.deleteEntity('machines', machineId);
            fetchData();
        }
    };

    const filteredMachines = useMemo(() => {
        return machines.filter(machine => {
            // Status filter
            if (statusFilter && machine.status !== statusFilter) {
                return false;
            }

            // Search term filter
            if (searchTerm) {
                const lowercasedFilter = searchTerm.toLowerCase().trim();
                const nameMatch = machine.name.toLowerCase().includes(lowercasedFilter);
                const serialMatch = machine.serialNumber.toLowerCase().includes(lowercasedFilter);
                if (!nameMatch && !serialMatch) {
                    return false;
                }
            }
            
            return true;
        });
    }, [machines, searchTerm, statusFilter]);

    const getRegionName = (regionId: string) => regions.find(r => r.id === regionId)?.name || 'N/A';
    const getPointName = (pointId: string | null) => pointId ? (points.find(p => p.id === pointId)?.name || 'N/A') : 'Без привязки';


    if (loading) return (
        <div className="flex justify-center items-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-brand-primary">Управление аппаратами</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold transition-colors shadow-sm"
                >
                    <PlusCircle className="w-5 h-5" />
                    Добавить аппарат
                </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Поиск по названию или S/N..."
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
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-brand-accent/60 hidden md:table-header-group">
                        <tr>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Название</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">S/N</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Статус</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Точка</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Регион</th>
                            <th className="py-3 px-4 text-center text-sm font-bold text-brand-primary uppercase tracking-wider">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group">
                        {filteredMachines.map((machine, index) => (
                            <tr key={machine.id} className={`block md:table-row border-t border-gray-200 md:border-t-0 mb-4 md:mb-0 rounded-lg md:rounded-none shadow-md md:shadow-none overflow-hidden ${index % 2 !== 0 ? 'md:bg-gray-50/70' : ''}`}>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Название</span>
                                    <span className="font-medium text-brand-primary">{machine.name}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">S/N</span>
                                    <span className="text-gray-700">{machine.serialNumber}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Статус</span>
                                    <StatusBadge status={machine.status} />
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Точка</span>
                                    <span className="text-gray-700 text-right">{getPointName(machine.pointId)}</span>
                                </td>
                                 <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Регион</span>
                                    <span className="text-gray-700">{getRegionName(machine.regionId)}</span>
                                </td>
                                <td className="p-3 flex justify-end md:justify-center items-center md:table-cell">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(machine)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Редактировать"><Edit size={18} /></button>
                                        <button onClick={() => handleDeleteMachine(machine.id)} className="text-status-error hover:text-red-800 p-1 transition-colors" title="Удалить"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredMachines.length === 0 && !loading && (
                    <p className="p-4 text-center text-gray-500">Аппараты не найдены.</p>
                )}
            </div>

            {isModalOpen && <MachineModal machine={currentMachine} regions={regions} points={points} onSave={handleSaveMachine} onClose={handleCloseModal} />}
        </div>
    );
};

interface MachineModalProps {
    machine: Machine | null;
    regions: Region[];
    points: Point[];
    onSave: (machine: Omit<Machine, 'id'> | Machine) => void;
    onClose: () => void;
}

const MachineModal: React.FC<MachineModalProps> = ({ machine, regions, points, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: machine?.name || '',
        serialNumber: machine?.serialNumber || '',
        regionId: machine?.regionId || '',
        pointId: machine?.pointId || null,
        status: machine?.status || MachineStatus.OK,
    });

    const availablePoints = useMemo(() => {
        if (!formData.regionId) return [];
        return points.filter(p => p.regionId === formData.regionId);
    }, [formData.regionId, points]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value === 'null' ? null : value };

        if (name === 'regionId') {
            newFormData.pointId = null; // Reset point when region changes
        }
        
        setFormData(newFormData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(machine ? { ...machine, ...formData } : formData as Omit<Machine, 'id'>);
    };

    const labelClasses = "block text-sm font-medium text-brand-primary";
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4">
                <h3 className="text-xl font-bold mb-4 text-brand-primary">{machine ? 'Редактировать аппарат' : 'Добавить аппарат'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="machineName" className={labelClasses}>Название</label>
                        <input id="machineName" type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="machineSN" className={labelClasses}>Серийный номер</label>
                        <input id="machineSN" type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className={inputClasses} required />
                    </div>
                     <div>
                        <label htmlFor="machineStatus" className={labelClasses}>Статус</label>
                        <select id="machineStatus" name="status" value={formData.status} onChange={handleChange} className={inputClasses}>
                            <option value={MachineStatus.OK}>В работе</option>
                            <option value={MachineStatus.WARNING}>Требует внимания</option>
                            <option value={MachineStatus.ERROR}>Неисправен</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="machineRegion" className={labelClasses}>Регион</label>
                        <select id="machineRegion" name="regionId" value={formData.regionId} onChange={handleChange} className={inputClasses} required>
                            <option value="" disabled>Выберите регион</option>
                            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="machinePoint" className={labelClasses}>Точка</label>
                        <select id="machinePoint" name="pointId" value={formData.pointId || 'null'} onChange={handleChange} className={inputClasses} disabled={!formData.regionId}>
                            <option value="null">Без привязки к точке</option>
                            {availablePoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors">Отмена</button>
                        <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold transition-colors">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MachineManagement;
