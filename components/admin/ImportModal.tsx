import React, { useState } from 'react';
// FIX: Import ImportSummary from types.ts where it is defined and exported.
import { ImportSummary } from '../../types';
import { Upload, X, Loader2, FileCheck2, AlertCircle } from 'lucide-react';

interface ImportModalProps {
    entityName: string; // e.g., 'запчастей'
    csvHeaders: string[];
    onImport: (csvData: string) => Promise<ImportSummary>;
    onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ entityName, csvHeaders, onImport, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setSummary(null);
            setErrorMsg('');
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setStatus('importing');
        setErrorMsg('');
        setSummary(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target?.result as string;
            try {
                const result = await onImport(csvData);
                setSummary(result);
                setStatus(result.errors.length > 0 ? 'error' : 'success');
            } catch (err: any) {
                console.error("Import failed:", err);
                setErrorMsg(err.message || 'Произошла ошибка при импорте. Проверьте консоль для деталей.');
                setStatus('error');
            }
        };
        reader.onerror = () => {
            setErrorMsg('Не удалось прочитать файл.');
            setStatus('error');
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-brand-primary">Импорт {entityName}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border">
                    <p className="font-semibold">Инструкция по импорту:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Файл должен быть в формате CSV (разделитель - запятая).</li>
                        <li>Первая строка - заголовки столбцов: <code className="bg-gray-200 px-1 rounded">{csvHeaders.join(',')}</code></li>
                        <li>Значения в полях не должны содержать запятые.</li>
                        <li>Если запись с уникальным ключом (SKU, S/N, Название+Регион) существует, она будет обновлена. Иначе - создана.</li>
                    </ul>
                </div>

                <div className="mt-4">
                    <label htmlFor="csv-upload" className="block text-sm font-medium text-brand-primary mb-1">Выберите CSV файл</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="csv-file-input" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                                    <span>Загрузить файл</span>
                                    <input id="csv-file-input" name="csv-file-input" type="file" className="sr-only" accept=".csv,text/csv" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">или перетащите его сюда</p>
                            </div>
                            <p className="text-xs text-gray-500">{file ? file.name : 'CSV файл'}</p>
                        </div>
                    </div>
                </div>

                {status === 'importing' && (
                    <div className="mt-4 text-center">
                        <Loader2 className="h-8 w-8 text-brand-primary animate-spin mx-auto" />
                        <p className="mt-2 text-brand-primary">Идет импорт...</p>
                    </div>
                )}
                
                {status === 'error' && errorMsg && (
                    <div className="mt-4 p-4 rounded-md bg-red-50 border-red-200">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-status-error" />
                            <h4 className="text-lg font-bold text-red-800">Ошибка импорта</h4>
                        </div>
                        <p className="mt-2 text-sm text-red-700">{errorMsg}</p>
                    </div>
                )}


                {summary && (status === 'success' || status === 'error') && (
                    <div className={`mt-4 p-4 rounded-md ${status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                         <div className="flex items-center gap-3">
                           {status === 'success' ? <FileCheck2 className="h-6 w-6 text-status-ok" /> : <AlertCircle className="h-6 w-6 text-status-error" />}
                           <h4 className={`text-lg font-bold ${status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                               {status === 'success' ? 'Импорт успешно завершен!' : 'Импорт завершен с ошибками'}
                           </h4>
                        </div>
                        <p className="mt-2 text-sm text-gray-800">
                            Создано новых записей: <span className="font-bold">{summary.created}</span>. 
                            Обновлено существующих: <span className="font-bold">{summary.updated}</span>.
                        </p>
                        {summary.errors.length > 0 && (
                            <div className="mt-2">
                                <p className="font-semibold text-yellow-800">Обнаружены ошибки ({summary.errors.length}):</p>
                                <ul className="text-sm text-yellow-700 list-disc list-inside max-h-24 overflow-y-auto bg-white p-2 rounded border">
                                    {summary.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                        Закрыть
                    </button>
                    <button onClick={handleImport} disabled={!file || status === 'importing'} className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {status === 'importing' ? 'Обработка...' : 'Импортировать'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
