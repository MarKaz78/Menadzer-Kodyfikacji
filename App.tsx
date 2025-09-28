
import React, { useState, useMemo, useRef } from 'react';
import { DropdownList } from './components/DropdownList';
import { PlusIcon } from './components/icons/PlusIcon';
import { ClipboardIcon } from './components/icons/ClipboardIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { InformationCircleIcon } from './components/icons/InformationCircleIcon';
import { XIcon } from './components/icons/XIcon';

// Add type declaration for the XLSX library loaded from CDN
declare const XLSX: any;

export interface ListItem {
    value: string;
    description: string;
}

export interface ListState {
    id: number;
    name: string;
    items: ListItem[];
    newItemValue: string;
    newItemDescription: string;
    selectedItem: string;
    error: string | null;
    displayMode: 'value' | 'description';
    sortMode: 'none' | 'asc' | 'desc';
    charLimit: number;
}

const App: React.FC = () => {
    const [lists, setLists] = useState<ListState[]>([
        {
            id: 1,
            name: 'Lista 1',
            items: [
                { value: 'Jabłko', description: 'Czerwone i soczyste.' },
                { value: 'Banan', description: 'Długi i żółty.' },
                { value: 'Wiśnia', description: 'Mała i słodka.' }
            ],
            newItemValue: '',
            newItemDescription: '',
            selectedItem: 'Jabłko',
            error: null,
            displayMode: 'value',
            sortMode: 'none',
            charLimit: 20,
        }
    ]);
    const [isCopied, setIsCopied] = useState(false);
    const [draggedListId, setDraggedListId] = useState<number | null>(null);
    const [separator, setSeparator] = useState<string>('_');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const combinedCode = useMemo(() => 
        lists
            .map(list => list.selectedItem)
            .filter(Boolean) // Pomiń puste/niezaznaczone pozycje
            .join(separator), 
        [lists, separator]
    );

    const handleCopyToClipboard = () => {
        if (!combinedCode) return;

        navigator.clipboard.writeText(combinedCode).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        }).catch(err => {
            console.error('Błąd podczas kopiowania: ', err);
        });
    };

    const handleAddList = () => {
        const newList: ListState = {
            id: Date.now(),
            name: `Lista ${lists.length + 1}`,
            items: [],
            newItemValue: '',
            newItemDescription: '',
            selectedItem: '',
            error: null,
            displayMode: 'value',
            sortMode: 'none',
            charLimit: 20,
        };
        setLists(prevLists => [...prevLists, newList]);
    };

    const handleDeleteList = (listId: number) => {
        setLists(prevLists => prevLists.filter(list => list.id !== listId));
    };

    const updateListState = (listId: number, updatedValues: Partial<ListState>) => {
        setLists(prevLists => 
            prevLists.map(list => 
                list.id === listId ? { ...list, ...updatedValues } : list
            )
        );
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, listId: number) => {
        e.dataTransfer.setData('text/plain', listId.toString());
        setDraggedListId(listId);
        document.body.classList.add('grabbing');
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetListId: number) => {
        e.preventDefault();
        const sourceListId = Number(e.dataTransfer.getData('text/plain'));
        
        if (sourceListId === targetListId) return;

        setLists(prevLists => {
            const sourceIndex = prevLists.findIndex(list => list.id === sourceListId);
            const targetIndex = prevLists.findIndex(list => list.id === targetListId);

            if (sourceIndex === -1 || targetIndex === -1) return prevLists;

            const newLists = [...prevLists];
            const [draggedList] = newLists.splice(sourceIndex, 1);
            newLists.splice(targetIndex, 0, draggedList);

            return newLists;
        });
    };

    const handleDragEnd = () => {
        setDraggedListId(null);
        document.body.classList.remove('grabbing');
    };
    
    const handleExport = () => {
        const workbook = XLSX.utils.book_new();
        lists.forEach(list => {
            // Sanitize sheet name for Excel limitations
            const sheetName = list.name.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
            const worksheetData = list.items.map(item => ({ Pozycja: item.value, Opis: item.description }));
            const worksheet = XLSX.utils.json_to_sheet(worksheetData, { header: ["Pozycja", "Opis"] });
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        });
        XLSX.writeFile(workbook, "lists-export.xlsx");
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const importedLists: ListState[] = workbook.SheetNames.map((sheetName: string) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    const items: ListItem[] = json
                        .slice(1) // Pomiń nagłówek
                        .map(row => ({
                            value: String(row[0] || ''),
                            description: String(row[1] || '')
                        }))
                        .filter(item => item.value.trim() !== '');
                    
                    const calculatedCharLimit = items.length > 0
                        ? Math.max(...items.map(item => item.value.length))
                        : 20;

                    return {
                        id: Date.now() + Math.random(),
                        name: sheetName,
                        items: items,
                        newItemValue: '',
                        newItemDescription: '',
                        selectedItem: items[0]?.value || '',
                        error: null,
                        displayMode: 'value',
                        sortMode: 'none',
                        charLimit: Math.max(1, calculatedCharLimit),
                    };
                });
                setLists(importedLists);
            } catch (error) {
                console.error("Błąd podczas importowania pliku:", error);
                alert("Wystąpił błąd podczas przetwarzania pliku. Upewnij się, że ma on prawidłowy format.");
            }
        };
        reader.readAsBinaryString(file);
        
        // Reset file input to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8 relative">
                    <h1 className="text-4xl font-bold text-gray-800">Menadżer Kodyfikacji</h1>
                    <p className="text-gray-500 mt-2">Przeciągaj i upuszczaj listy, aby zmienić ich kolejność.</p>
                     <div className="absolute top-0 right-0 flex space-x-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImport}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button
                            onClick={triggerFileSelect}
                            className="bg-white text-gray-700 py-2 px-4 rounded-lg flex items-center gap-2 shadow-md hover:bg-gray-100 transition-colors"
                            aria-label="Importuj listy z pliku Excel"
                        >
                            <UploadIcon className="h-5 w-5" />
                            <span>Importuj</span>
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={lists.length === 0}
                            className="bg-white text-gray-700 py-2 px-4 rounded-lg flex items-center gap-2 shadow-md hover:bg-gray-100 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                            aria-label="Eksportuj listy do pliku Excel"
                        >
                            <DownloadIcon className="h-5 w-5" />
                            <span>Eksportuj</span>
                        </button>
                        <button
                            onClick={() => setIsInfoModalOpen(true)}
                            className="bg-white text-gray-700 py-2 px-4 rounded-lg flex items-center gap-2 shadow-md hover:bg-gray-100 transition-colors"
                            aria-label="Informacje o stronie"
                        >
                            <InformationCircleIcon className="h-5 w-5" />
                            <span>Info</span>
                        </button>
                    </div>
                </header>

                {lists.length > 0 && (
                     <section className="mb-8 bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Wspólny Kod</h2>
                             <div className="flex items-center gap-2">
                                <label htmlFor="separator-select" className="text-sm font-medium text-gray-700">Separator:</label>
                                <select
                                    id="separator-select"
                                    value={separator}
                                    onChange={(e) => setSeparator(e.target.value)}
                                    className="p-1 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                                >
                                    <option value="_">_ (podkreślenie)</option>
                                    <option value="-">- (myślnik)</option>
                                    <option value=" "> (spacja)</option>
                                    <option value=",">, (przecinek)</option>
                                    <option value=";">; (średnik)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                             <input
                                id="combinedCode"
                                type="text"
                                value={combinedCode}
                                readOnly
                                placeholder="Wybierz pozycje z list, aby wygenerować kod"
                                className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200 bg-gray-50 text-gray-600 font-mono"
                            />
                            <button
                                onClick={handleCopyToClipboard}
                                disabled={!combinedCode}
                                className={`text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shrink-0 w-full sm:w-36 ${
                                    isCopied 
                                        ? 'bg-green-500' 
                                        : 'bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                                }`}
                                aria-label="Kopiuj wspólny kod do schowka"
                            >
                                {isCopied ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
                                <span>{isCopied ? 'Skopiowano!' : 'Kopiuj'}</span>
                            </button>
                        </div>
                    </section>
                )}
                
                <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {lists.map(list => (
                        <div
                            key={list.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, list.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, list.id)}
                            onDragEnd={handleDragEnd}
                            className={`transition-opacity duration-300 cursor-grab ${
                                draggedListId === list.id ? 'opacity-50' : 'opacity-100'
                            }`}
                        >
                            <DropdownList 
                                list={list}
                                onUpdate={updateListState}
                                onDelete={handleDeleteList}
                            />
                        </div>
                    ))}
                    <button
                        onClick={handleAddList}
                        className="group w-full bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-gray-50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[200px]"
                        aria-label="Dodaj nową listę"
                    >
                        <PlusIcon className="h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xl font-bold text-gray-500 group-hover:text-blue-600 transition-colors">Dodaj nową listę</span>
                    </button>
                </main>
                {lists.length === 0 && (
                     <div className="text-center py-16 px-8 bg-white rounded-2xl shadow-xl">
                        <h2 className="text-2xl font-semibold text-gray-700">Brak list do wyświetlenia.</h2>
                        <p className="text-gray-500 mt-2">Zaimportuj plik lub kliknij przycisk "Dodaj nową listę", aby rozpocząć.</p>
                    </div>
                )}
                <footer className="text-center pt-10 pb-4 text-gray-500 text-sm">
                    <p>
                        Stworzone przez{' '}
                        <a 
                            href="https://www.linkedin.com/company/bim-partner/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-semibold text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                        >
                            BIM PARTNER
                        </a>. Wszelkie prawa zastrzeżone.
                    </p>
                </footer>
            </div>

            {isInfoModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setIsInfoModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="info-modal-title"
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative transform transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setIsInfoModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Zamknij okno informacyjne"
                        >
                            <XIcon className="h-6 w-6" />
                        </button>
                        <h2 id="info-modal-title" className="text-2xl font-bold text-gray-800 mb-4">O Aplikacji "Menadżer Kodyfikacji"</h2>
                        <div className="text-gray-600 space-y-4">
                            <p>
                                Ta aplikacja została zaprojektowana z myślą o uproszczeniu kodyfikacji nazw plików, stanowiąc kluczowe narzędzie w zarządzaniu dużymi zbiorami danych i dokumentów.
                            </p>
                            <h3 className="text-lg font-semibold text-gray-700 pt-2">Kluczowe funkcje:</h3>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li><strong>Dynamiczne Listy:</strong> Twórz i usuwaj dowolną liczbę list rozwijanych.</li>
                                <li><strong>Zarządzanie Pozycjami:</strong> Dodawaj, edytuj i usuwaj pozycje w każdej liście, wraz z opcjonalnymi opisami.</li>
                                <li><strong>Zmiana Kolejności:</strong> Użyj metody "przeciągnij i upuść" (drag-and-drop), aby łatwo zmieniać kolejność list.</li>
                                <li><strong>Generowanie Kodu:</strong> Automatycznie generuj wspólny kod z aktualnie wybranych pozycji na wszystkich listach, z możliwością wyboru separatora.</li>
                                <li><strong>Sortowanie i Filtrowanie:</strong> Sortuj pozycje w listach alfabetycznie i przełączaj widok między nazwą a opisem.</li>
                                <li><strong>Import/Eksport Excel:</strong> Wygodnie eksportuj wszystkie swoje listy do jednego pliku .xlsx lub importuj je z powrotem, aby kontynuować pracę.</li>
                            </ul>
                            <h3 className="text-lg font-semibold text-gray-700 pt-2">Prywatność Danych:</h3>
                            <p>
                                Twoja prywatność jest dla nas ważna. Wszystkie dane, które wprowadzasz i importujesz, są przetwarzane <strong>wyłącznie lokalnie w Twojej przeglądarce</strong>. Żadne informacje nie są wysyłane ani przechowywane na zewnętrznych serwerach. Twoje listy należą tylko do Ciebie.
                            </p>
                             <p className="pt-4">
                                Stworzone przez{' '}
                                <a 
                                    href="https://www.linkedin.com/company/bim-partner/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="font-semibold text-blue-600 hover:underline"
                                >
                                    BIM PARTNER
                                </a>.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
