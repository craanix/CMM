import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../../services/api';
import type { Machine, MaintenanceRecord, User, Part, UsedPart } from '../../types';
import { MachineStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, Coffee, Settings, Calendar, User as UserIcon, PlusCircle, Wrench, X } from 'lucide-react';

const StatusBadge: React.FC<{ status: MachineStatus }> = ({ status }) => {
    const statusStyles: Record<MachineStatus, { text: string; bg: string; textColor: string; }> = {
        [MachineStatus.OK]: { text: 'В работе', bg: 'bg-status-ok/10', textColor: 'text-status-ok' },
        [MachineStatus.WARNING]: { text: 'Требует внимания', bg: 'bg-status-warning/10', textColor: 'text-status-warning' },
        [MachineStatus.ERROR]: { text: 'Неисправен', bg: 'bg-status-error/10', textColor: 'text-status-error' },
    };
    const style = statusStyles[status] || statusStyles.OK;
    return (
        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${style.bg} ${style.textColor} inline-block`}>
            {style.text}
        </span>
    );
};

const MachineDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
        // Fetch machine-specific details and the general data in parallel.
        // This uses the main 'allData' cache, which is populated by the dashboard and sync process,
        // ensuring user and part lists are available offline after syncing.
        const [details, allData] = await Promise.all([
            api.getMachineDetails(id),
            api.getAllDataForUser()
        ]);

        if (details) {
            setMachine(details.machine);
            setRecords(details.records);
        }
        
        if (allData) {
            setUsers(allData.users);
            setParts(allData.parts);
        }
    } catch (e) {
        console.error("Failed to load machine detail data, might be offline with no cache.", e);
        // Let the component render the "not found" message
    } finally {
        setLoading(false);
    }
  }, [id]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Неизвестный пользователь';
  const getPartName = (partId: string) => parts.find(p => p.id === partId)?.name || 'Неизвестная запчасть';
  
  const handleRecordAdded = (newRecord: MaintenanceRecord, newStatus: MachineStatus) => {
      setRecords(prev => [newRecord, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setMachine(prev => prev ? { ...prev, status: newStatus } : null);
      setShowAddForm(false);
  }

  if (loading) {
    return <div className="flex justify-center items-center mt-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div></div>;
  }

  if (!machine) {
    return <p className="text-center text-red-500 mt-10">Аппарат не найден.</p>;
  }

  return (
    <div className="container mx-auto max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-brand-secondary hover:text-brand-primary mb-4 font-medium transition-colors">
        <ChevronLeft className="w-5 h-5" />
        Назад к панели
      </Link>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Coffee className="w-10 h-10 sm:w-12 sm:h-12 text-brand-primary mt-1 flex-shrink-0" />
          <div className="flex-grow">
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary">{machine.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-gray-500">
                <span>SN: {machine.serialNumber}</span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <StatusBadge status={machine.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="flex flex-col items-start sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-brand-primary flex items-center gap-2">
                <Settings className="w-6 h-6"/>
                История обслуживания
            </h2>
            <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors font-semibold shadow-sm w-full sm:w-auto justify-center"
            >
                <PlusCircle className="w-5 h-5"/>
                Добавить запись
            </button>
        </div>

        {showAddForm && user && (
            <AddRecordForm 
                machineId={machine.id} 
                userId={user.id} 
                parts={parts} 
                onRecordAdded={handleRecordAdded} 
                onCancel={() => setShowAddForm(false)} 
                currentStatus={machine.status}
            />
        )}
        
        <div className="space-y-6">
          {records.map(record => (
            <div key={record.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50/50 hover:border-gray-300 transition-all">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2 mb-2 sm:mb-0">
                        <UserIcon className="w-4 h-4"/>
                        <span className="font-medium">{getUserName(record.userId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4"/>
                        <span>{new Date(record.timestamp).toLocaleString('ru-RU')}</span>
                    </div>
                </div>
              <p className="mb-3 text-brand-primary">{record.description}</p>
              {record.usedParts.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 text-brand-primary/80"><Wrench className="w-4 h-4"/>Использованные запчасти:</h4>
                  <ul className="list-disc list-inside ml-2 mt-1 text-sm text-gray-700 space-y-1">
                    {record.usedParts.map(p => (
                      <li key={p.partId}>{getPartName(p.partId)} <span className="font-semibold">(x{p.quantity})</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {records.length === 0 && <p className="text-center text-gray-500 py-4">Записи об обслуживании отсутствуют.</p>}
        </div>
      </div>
    </div>
  );
};

interface AddRecordFormProps {
    machineId: string;
    userId: string;
    parts: Part[];
    currentStatus: MachineStatus;
    onRecordAdded: (record: MaintenanceRecord, newStatus: MachineStatus) => void;
    onCancel: () => void;
}

const AddRecordForm: React.FC<AddRecordFormProps> = ({ machineId, userId, parts, currentStatus, onRecordAdded, onCancel }) => {
    const [description, setDescription] = useState('');
    const [usedParts, setUsedParts] = useState<{partId: string; quantity: number}[]>([]);
    const [newStatus, setNewStatus] = useState<MachineStatus>(currentStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddPart = () => {
        setUsedParts([...usedParts, { partId: parts[0]?.id || '', quantity: 1}]);
    }
    
    const handlePartChange = (index: number, field: 'partId' | 'quantity', value: string) => {
        const newParts = [...usedParts];
        if (field === 'partId') {
            newParts[index].partId = value;
        } else {
            newParts[index].quantity = parseInt(value, 10) || 1;
        }
        setUsedParts(newParts);
    }
    
    const handleRemovePart = (index: number) => {
        setUsedParts(usedParts.filter((_, i) => i !== index));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;
        setIsSubmitting(true);
        const newRecordData = {
            machineId,
            userId,
            description,
            usedParts: usedParts.filter(p => p.partId),
            timestamp: new Date().toISOString(),
        };
        const newRecord = await api.addMaintenanceRecord(newRecordData);
        await api.updateEntity('machines', { id: machineId, status: newStatus });
        onRecordAdded(newRecord, newStatus);
        setIsSubmitting(false);
    }
    
    const inputBaseClasses = "block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-brand-primary placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="p-4 mb-6 border-2 border-brand-accent rounded-lg bg-white animate-fade-in shadow-inner">
            <h3 className="text-lg font-semibold mb-3 text-brand-primary">Новая запись об обслуживании</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-brand-primary mb-1">Описание работ</label>
                <textarea
                    id="description"
                    className={inputBaseClasses}
                    rows={3}
                    placeholder="Опишите проделанную работу..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                ></textarea>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-brand-primary mb-1">Новый статус аппарата</label>
                <select id="status" value={newStatus} onChange={e => setNewStatus(e.target.value as MachineStatus)} className={inputBaseClasses}>
                    <option value={MachineStatus.OK}>В работе</option>
                    <option value={MachineStatus.WARNING}>Требует внимания</option>
                    <option value={MachineStatus.ERROR}>Неисправен</option>
                </select>
              </div>
            </div>
            
            <h4 className="font-semibold mt-4 mb-2 text-brand-primary/90">Использованные запчасти</h4>
            <div className="space-y-2">
            {usedParts.map((part, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                        value={part.partId}
                        onChange={(e) => handlePartChange(index, 'partId', e.target.value)}
                        className={`${inputBaseClasses} w-full sm:flex-grow`}
                    >
                        <option value="" disabled>Выберите запчасть</option>
                        {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            value={part.quantity}
                            onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                            className={`${inputBaseClasses} w-full sm:w-24`}
                        />
                        <button type="button" onClick={() => handleRemovePart(index)} className="p-2 text-status-error rounded-md hover:bg-red-100 transition-colors flex-shrink-0">
                            <X size={18}/>
                        </button>
                    </div>
                </div>
            ))}
            </div>
            <button type="button" onClick={handleAddPart} className="mt-3 text-sm text-brand-primary font-semibold hover:underline flex items-center gap-1">
                <PlusCircle size={16}/> Добавить запчасть
            </button>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors">Отмена</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors">
                    {isSubmitting ? 'Сохранение...' : 'Сохранить запись'}
                </button>
            </div>
        </form>
    );
}

export default MachineDetailScreen;