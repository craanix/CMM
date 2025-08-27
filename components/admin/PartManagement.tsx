
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../../services/api';
import type { Part, User } from '../../types';
import { Role } from '../../types';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';

const PartManagement: React.FC = () => {
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPart, setCurrentPart] = useState<Part | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        // FIX: api.getAllDataForUser expects 0 arguments. Admin role is inferred from auth token on the server.
        const allData = await api.getAllDataForUser();
        setParts(allData.parts);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (part: Part | null = null) => {
        setCurrentPart(part);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentPart(null);
    };

    const handleSavePart = async (partToSave: Omit<Part, 'id'> | Part) => {
        if ('id' in partToSave) {
            await api.updateEntity('parts', partToSave);
        } else {
            await api.addEntity('parts', partToSave);
        }
        fetchData();
        handleCloseModal();
    };

    const handleDeletePart = async (partId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту запчасть?')) {
            await api.deleteEntity('parts', partId);
            fetchData();
        }
    };

    const filteredParts = useMemo(() => {
        if (!searchTerm) return parts;
        const lowercasedFilter = searchTerm.toLowerCase().trim();
        return parts.filter(part =>
            part.name.toLowerCase().includes(lowercasedFilter) ||
            part.sku.toLowerCase().includes(lowercasedFilter)
        );
    }, [parts, searchTerm]);

    if (loading) return (
        <div className="flex justify-center items-center mt-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 bg-white rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-brand-primary">Управление запчастями</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold transition-colors shadow-sm"
                >
                    <PlusCircle className="w-5 h-5" />
                    Добавить запчасть
                </button>
            </div>
            <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Поиск по названию или артикулу..."
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
                            <th className="py-3 px-4 text-left text-sm font-bold text-brand-primary uppercase tracking-wider">Артикул (SKU)</th>
                            <th className="py-3 px-4 text-center text-sm font-bold text-brand-primary uppercase tracking-wider">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group">
                        {filteredParts.map((part, index) => (
                            <tr key={part.id} className={`block md:table-row border-t border-gray-200 md:border-t-0 mb-4 md:mb-0 rounded-lg md:rounded-none shadow-md md:shadow-none overflow-hidden ${index % 2 !== 0 ? 'md:bg-gray-50/70' : ''}`}>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Название</span>
                                    <span className="font-medium text-brand-primary">{part.name}</span>
                                </td>
                                <td className="p-3 flex justify-between items-center border-b md:border-none md:table-cell">
                                    <span className="font-semibold text-brand-primary/90 md:hidden">Артикул (SKU)</span>
                                    <span className="text-gray-700">{part.sku}</span>
                                </td>
                                <td className="p-3 flex justify-end md:justify-center items-center md:table-cell">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(part)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Редактировать"><Edit size={18} /></button>
                                        <button onClick={() => handleDeletePart(part.id)} className="text-status-error hover:text-red-800 p-1 transition-colors" title="Удалить"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredParts.length === 0 && !loading && (
                    <p className="p-4 text-center text-gray-500">Запчасти не найдены.</p>
                )}
            </div>

            {isModalOpen && <PartModal part={currentPart} onSave={handleSavePart} onClose={handleCloseModal} />}
        </div>
    );
};

interface PartModalProps {
    part: Part | null;
    onSave: (part: Omit<Part, 'id'> | Part) => void;
    onClose: () => void;
}

const PartModal: React.FC<PartModalProps> = ({ part, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: part?.name || '',
        sku: part?.sku || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(part ? { ...part, ...formData } : formData as Omit<Part, 'id'>);
    };

    const labelClasses = "block text-sm font-medium text-brand-primary";
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md m-4">
                <h3 className="text-xl font-bold mb-4 text-brand-primary">{part ? 'Редактировать запчасть' : 'Добавить запчасть'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="partName" className={labelClasses}>Название</label>
                        <input id="partName" type="text" name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                    </div>
                     <div>
                        <label htmlFor="partSku" className={labelClasses}>Артикул (SKU)</label>
                        <input id="partSku" type="text" name="sku" value={formData.sku} onChange={handleChange} className={inputClasses} required />
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

export default PartManagement;
