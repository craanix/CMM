

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../../services/api';
// FIX: Import ImportSummary directly from types
import type { Point, Region, ImportSummary } from '../../types';
import { PlusCircle, Edit, Trash2, Search, AlertTriangle, Upload, Download } from 'lucide-react';
import ImportModal from './ImportModal';


const PointManagement: React.FC = () => {
    const [points, setPoints] = useState<Point[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pointToDelete, setPointToDelete] = useState<Point | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        // FIX: api.getAllDataForUser expects 0 arguments. Admin role is inferred from auth token on the server.
        const allData = await api.getAllDataForUser();
        setPoints(allData.points);
        setRegions(allData.regions);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (point: Point | null = null) => {
        setCurrentPoint(point);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentPoint(null);
    };

    const handleSavePoint = async (pointToSave: Omit<Point, 'id'> | Point) => {
        if ('id' in pointToSave) {
            await api.updateEntity('points', pointToSave);
        } else {
            await api.addEntity('points', pointToSave);
        }
        fetchData();
        handleCloseModal();
    };

    const handleDeleteClick = (point: Point) => {
        setPointToDelete(point);
    };

    const handleConfirmDelete = useCallback(async () => {
        if (pointToDelete) {
            await api.deleteEntity('points', pointToDelete.id);
            fetchData();
            setPointToDelete(null);
        }
    }, [pointToDelete, fetchData]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (pointToDelete && event.key === 'Enter') {
                handleConfirmDelete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [pointToDelete, handleConfirmDelete]);
    
    const handleExport = async () => {
        await api.exportEntities('points');
    };

    const handleImport = async (csvData: string): Promise<ImportSummary> => {
        const summary = await api.importEntities('points', csvData);
        fetchData(); // Refresh data after import
        return summary;
    };


    const filteredPoints = useMemo(() => {
        if (!searchTerm) return points;
        const lowercasedFilter = searchTerm.toLowerCase().trim();
        return points.filter(point =>
            point.name.toLowerCase().includes(lowercasedFilter) ||
            point.address.toLowerCase().includes(lowercasedFilter)
        );
    }, [points, searchTerm]);

    if (loading) return (
        <div className="flex justify-center items-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-brand-primary">Управление точками</h2>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors shadow-sm text-sm">
                        <Upload className="w-4 h-4" /> Импорт
                    </button>
                    <button onClick={handleExport} className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors shadow-sm text-sm">
                        <Download className="w-4 h-4" /> Экспорт
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold transition-colors shadow-sm text-sm"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Добавить точку
                    </button>
                </div>
            </div>
            <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Поиск по названию или адресу..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-secondary focus:border-brand-secondary bg-white text-brand-primary placeholder-gray-500"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-brand-accent/60 hidden md:table-header-group">
                        <tr>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Название</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Адрес</th>
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Регион</th>
                            <th className="py-3 px-4 text-center text-sm font-bold text-brand-primary uppercase tracking-wider">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group">
                        {filteredPoints.map((point, index) => (
                            <tr key={point.id} className={`block md:table-row border-t border-gray-200 md:border-t-0 mb-4 md:mb-0 rounded-lg md:rounded-none shadow-md md:shadow-none overflow-hidden ${index % 2 !== 0 ? 'md:bg-gray-50/70' : ''}`}>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Название</span>
                                    <span className="font-medium text-brand-primary">{point.name}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Адрес</span>
                                    <span className="text-gray-700 text-right">{point.address}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Регион</span>
                                    <span className="text-gray-700">{regions.find(r => r.id === point.regionId)?.name || 'N/A'}</span>
                                </td>
                                <td className="p-3 flex justify-end md:justify-center items-center md:table-cell">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(point)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Редактировать"><Edit size={18} /></button>
                                        <button onClick={() => handleDeleteClick(point)} className="text-status-error hover:text-red-800 p-1 transition-colors" title="Удалить"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredPoints.length === 0 && !loading && (
                    <p className="p-4 text-center text-gray-500">Точки не найдены.</p>
                )}
            </div>

            {isModalOpen && <PointModal point={currentPoint} regions={regions} onSave={handleSavePoint} onClose={handleCloseModal} />}

            {isImportModalOpen && (
                <ImportModal
                    entityName="точек"
                    csvHeaders={['name', 'address', 'region_name']}
                    onImport={handleImport}
                    onClose={() => setIsImportModalOpen(false)}
                />
            )}

            {pointToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <AlertTriangle className="h-6 w-6 text-status-error" aria-hidden="true" />
                            </div>
                            <div className="ml-4 flex-grow">
                                <h3 className="text-xl font-bold text-brand-primary">Удалить точку</h3>
                                <p className="text-gray-600 mt-2">
                                    Вы уверены, что хотите удалить точку <span className="font-bold">{pointToDelete.name}</span>? Все связанные аппараты также будут удалены. Это действие нельзя отменить.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => setPointToDelete(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-status-error text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface PointModalProps {
    point: Point | null;
    regions: Region[];
    onSave: (point: Omit<Point, 'id'> | Point) => void;
    onClose: () => void;
}

const PointModal: React.FC<PointModalProps> = ({ point, regions, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: point?.name || '',
        address: point?.address || '',
        regionId: point?.regionId || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(point ? { ...point, ...formData } : formData as Omit<Point, 'id'>);
    };

    const labelClasses = "block text-sm font-medium text-brand-primary";
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4">
                <h3 className="text-xl font-bold mb-4 text-brand-primary">{point ? 'Редактировать точку' : 'Добавить точку'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="pointName" className={labelClasses}>Название</label>
                        <input id="pointName" type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="pointAddress" className={labelClasses}>Адрес</label>
                        <input id="pointAddress" type="text" name="address" value={formData.address} onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="pointRegion" className={labelClasses}>Регион</label>
                        <select id="pointRegion" name="regionId" value={formData.regionId} onChange={handleChange} className={inputClasses} required>
                            <option value="" disabled>Выберите регион</option>
                            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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

export default PointManagement;
