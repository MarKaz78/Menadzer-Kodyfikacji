import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { DragHandleIcon } from './icons/DragHandleIcon';
import { SwitchHorizontalIcon } from './icons/SwitchHorizontalIcon';
import { ArrowsUpDownIcon } from './icons/ArrowsUpDownIcon';
import { SortAscendingIcon } from './icons/SortAscendingIcon';
import { SortDescendingIcon } from './icons/SortDescendingIcon';
import type { ListState, ListItem } from '../App';

interface DropdownListProps {
    list: ListState;
    onUpdate: (listId: number, updatedValues: Partial<ListState>) => void;
    onDelete: (listId: number) => void;
}

export const DropdownList: React.FC<DropdownListProps> = ({ list, onUpdate, onDelete }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(list.name);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const itemBeingEdited = useMemo(() => 
        list.items.find(item => item.value === list.selectedItem),
        [list.items, list.selectedItem]
    );
    const isEditingItemMode = !!itemBeingEdited;

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    const trimmedNewItemValue = list.newItemValue.trim();

    const isDuplicate = useMemo(() => {
        const lowerCaseValue = trimmedNewItemValue.toLowerCase();
        if (isEditingItemMode) {
            return list.items.some(
                item => item.value.toLowerCase() === lowerCaseValue && item.value !== itemBeingEdited.value
            );
        }
        return list.items.some(item => item.value.toLowerCase() === lowerCaseValue);
    }, [list.items, trimmedNewItemValue, isEditingItemMode, itemBeingEdited]);
    
    const isOverLimit = list.charLimit > 0 && trimmedNewItemValue.length > list.charLimit;

    const sortedItems = useMemo(() => {
        if (list.sortMode === 'none') {
            return [...list.items];
        }
        const sorted = [...list.items].sort((a, b) => 
            a.value.localeCompare(b.value, undefined, { sensitivity: 'base' })
        );
        if (list.sortMode === 'desc') {
            return sorted.reverse();
        }
        return sorted;
    }, [list.items, list.sortMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trimmedNewItemValue) {
            onUpdate(list.id, { error: "Nazwa pozycji nie może być pusta." });
            return;
        }
        if (isDuplicate) {
            onUpdate(list.id, { error: "Pozycja o tej nazwie już istnieje." });
            return;
        }
        if (isOverLimit) {
            onUpdate(list.id, { error: `Nazwa przekracza limit ${list.charLimit} znaków.` });
            return;
        }

        if (isEditingItemMode) {
            const updatedItems = list.items.map(item =>
                item.value === itemBeingEdited.value
                    ? { value: trimmedNewItemValue, description: list.newItemDescription.trim() }
                    : item
            );
            onUpdate(list.id, {
                items: updatedItems,
                selectedItem: trimmedNewItemValue,
                error: null,
            });
        } else {
            const newItem: ListItem = {
                value: trimmedNewItemValue,
                description: list.newItemDescription.trim()
            };
            const updatedItems = [...list.items, newItem];
            onUpdate(list.id, {
                items: updatedItems,
                selectedItem: list.items.length === 0 ? newItem.value : list.selectedItem,
                newItemValue: '',
                newItemDescription: '',
                error: null,
            });
        }
    };

    const handleRemoveItem = () => {
        if (!list.selectedItem) return;

        const wasEditingThisItem = list.selectedItem === itemBeingEdited?.value;
        const updatedItems = list.items.filter(item => item.value !== list.selectedItem);
        const newSelectedItem = updatedItems.length > 0 ? updatedItems[0].value : '';
        
        onUpdate(list.id, {
            items: updatedItems,
            selectedItem: newSelectedItem,
            newItemValue: wasEditingThisItem ? '' : list.newItemValue,
            newItemDescription: wasEditingThisItem ? '' : list.newItemDescription,
            error: null,
        });
    };

    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = e.target.value;
        const selectedItemData = list.items.find(item => item.value === selectedValue);
        onUpdate(list.id, {
            selectedItem: selectedValue,
            newItemValue: selectedItemData ? selectedItemData.value : '',
            newItemDescription: selectedItemData ? selectedItemData.description : '',
            error: null,
        });
    };
    
    const handleCancelEdit = () => {
        onUpdate(list.id, {
            newItemValue: '',
            newItemDescription: '',
            selectedItem: '', // This deselects the item and exits edit mode
            error: null,
        });
    };

    const handleNewItemValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate(list.id, { newItemValue: e.target.value, error: null });
    };

    const handleNewItemDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate(list.id, { newItemDescription: e.target.value });
    };

    const handleSaveName = () => {
        const trimmedName = editedName.trim();
        if (trimmedName) {
            onUpdate(list.id, { name: trimmedName });
            setIsEditingName(false);
        }
    };

    const handleCancelEditName = () => {
        setEditedName(list.name);
        setIsEditingName(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            handleCancelEditName();
        }
    };

    const handleDisplayModeToggle = () => {
        const newMode = list.displayMode === 'value' ? 'description' : 'value';
        onUpdate(list.id, { displayMode: newMode });
    };

    const handleSortModeToggle = () => {
        const newSortMode = list.sortMode === 'none' ? 'asc' : list.sortMode === 'asc' ? 'desc' : 'none';
        onUpdate(list.id, { sortMode: newSortMode });
    };
    
    const submitButtonDisabled = !trimmedNewItemValue || isDuplicate || isOverLimit;

    const sortTooltip = 
        list.sortMode === 'none' ? 'Sortuj A-Z' :
        list.sortMode === 'asc' ? 'Sortuj Z-A' :
        'Wyłącz sortowanie';

    return (
        <div className="w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 flex flex-col">
            <div className="flex justify-between items-center gap-2">
                {isEditingName ? (
                    <div className="flex-grow flex items-center gap-2">
                         <input
                            ref={nameInputRef}
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleSaveName}
                            className="text-2xl font-bold text-gray-800 bg-gray-100 rounded-lg p-1 -m-1 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button onClick={handleSaveName} className="text-gray-500 hover:text-green-600 p-1" aria-label="Zapisz nazwę"><CheckIcon className="h-6 w-6" /></button>
                        <button onClick={handleCancelEditName} className="text-gray-500 hover:text-red-600 p-1" aria-label="Anuluj edycję"><XIcon className="h-6 w-6" /></button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 min-w-0">
                            <DragHandleIcon className="h-5 w-5 text-gray-300" />
                            <h2 className="text-2xl font-bold text-gray-800 truncate">{list.name}</h2>
                        </div>
                        <div className="flex items-center shrink-0">
                            <div className="flex items-center gap-2 mr-2">
                                <label htmlFor={`charLimit-${list.id}`} className="text-sm font-medium text-gray-600 sr-only">Limit znaków</label>
                                <input
                                    type="number"
                                    id={`charLimit-${list.id}`}
                                    title="Ustaw limit znaków dla nazwy pozycji"
                                    value={list.charLimit}
                                    onChange={(e) => onUpdate(list.id, { charLimit: Math.max(1, Number(e.target.value)) })}
                                    min="1"
                                    className="w-16 p-1 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={() => setIsEditingName(true)}
                                className="text-gray-400 hover:text-blue-600 transition-colors duration-200"
                                aria-label={`Edytuj nazwę ${list.name}`}
                            >
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => onDelete(list.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors duration-200 ml-2"
                                aria-label={`Usuń ${list.name}`}
                            >
                                <TrashIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                     <div className="flex justify-between items-center mb-1">
                        <label htmlFor={`newItemValue-${list.id}`} className="block text-sm font-medium text-gray-700">Nazwa pozycji</label>
                        <span className={`text-sm font-mono ${isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {list.newItemValue.length}/{list.charLimit}
                        </span>
                    </div>
                    <input
                        id={`newItemValue-${list.id}`}
                        type="text"
                        value={list.newItemValue}
                        onChange={handleNewItemValueChange}
                        placeholder="Np. Pomarańcza"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200"
                    />
                </div>
                 <div>
                    <label htmlFor={`newItemDesc-${list.id}`} className="block text-sm font-medium text-gray-700 mb-1">Opis (opcjonalnie)</label>
                    <input
                        id={`newItemDesc-${list.id}`}
                        type="text"
                        value={list.newItemDescription}
                        onChange={handleNewItemDescriptionChange}
                        placeholder="Np. Okrągła i pomarańczowa"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200"
                    />
                </div>
                <div className="flex items-center space-x-2">
                     <button
                        type="submit"
                        disabled={submitButtonDisabled}
                        className={`p-3 rounded-lg flex items-center justify-center transition-colors duration-200 text-white ${
                            isEditingItemMode
                                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300 flex-grow'
                                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 w-full'
                        } disabled:cursor-not-allowed`}
                    >
                        {isEditingItemMode ? (
                            <>
                                <CheckIcon className="h-5 w-5 mr-2" />
                                <span>Aktualizuj pozycję</span>
                            </>
                        ) : (
                            <>
                                <PlusIcon className="h-5 w-5 mr-2" />
                                <span>Dodaj pozycję</span>
                            </>
                        )}
                    </button>
                    {isEditingItemMode && (
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-3 rounded-lg flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors duration-200 shrink-0"
                            aria-label="Anuluj edycję i wyczyść formularz"
                        >
                            <XIcon className="h-5 w-5 mr-2" />
                            <span>Anuluj</span>
                        </button>
                    )}
                </div>
                {list.error && <p className="text-red-500 text-sm h-5">{list.error}</p>}
                {!list.error && isDuplicate && <p className="text-orange-500 text-sm h-5">Ta pozycja już istnieje.</p>}
                {!list.error && !isDuplicate && isOverLimit && <p className="text-red-500 text-sm h-5">Nazwa pozycji jest za długa.</p>}
                {!list.error && !isDuplicate && !isOverLimit && <div className="h-5"></div>}
            </form>
            
            <div className="space-y-2 flex-grow flex flex-col justify-end">
                 <div className="flex justify-between items-center">
                    <label htmlFor={`itemDropdown-${list.id}`} className="block text-sm font-medium text-gray-700">Dostępne pozycje</label>
                    {list.items.length > 0 && (
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={handleSortModeToggle}
                                className="text-gray-500 hover:text-blue-600 p-1 rounded-full transition-colors"
                                aria-label={sortTooltip}
                                title={sortTooltip}
                            >
                                {list.sortMode === 'asc' && <SortAscendingIcon className="h-5 w-5" />}
                                {list.sortMode === 'desc' && <SortDescendingIcon className="h-5 w-5" />}
                                {list.sortMode === 'none' && <ArrowsUpDownIcon className="h-5 w-5" />}
                            </button>
                             <button
                                type="button"
                                onClick={handleDisplayModeToggle}
                                className="text-gray-500 hover:text-blue-600 p-1 rounded-full transition-colors"
                                aria-label="Przełącz widok pomiędzy nazwą a opisem"
                                title="Przełącz widok pomiędzy nazwą a opisem"
                            >
                                <SwitchHorizontalIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex space-x-2">
                    <select
                        id={`itemDropdown-${list.id}`}
                        value={list.selectedItem}
                        onChange={handleSelectionChange}
                        disabled={list.items.length === 0}
                        className="flex-grow p-3 border border-gray-300 rounded-lg bg-white appearance-none focus:ring-2 focus:ring-gray-400 focus:outline-none transition duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed truncate min-w-0"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                        {sortedItems.length === 0 ? (
                            <option value="" disabled>Lista jest pusta</option>
                        ) : (
                            <>
                                <option value="" disabled={list.selectedItem !== ''}>Wybierz pozycję...</option>
                                {sortedItems.map(item => (
                                    <option 
                                        key={item.value} 
                                        value={item.value} 
                                        title={list.displayMode === 'value' ? item.description : item.value}
                                    >
                                        {list.displayMode === 'value' ? item.value : (item.description || item.value)}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                    <button
                        onClick={handleRemoveItem}
                        disabled={!list.selectedItem || list.items.length === 0}
                        className="bg-red-600 text-white p-3 rounded-lg flex items-center justify-center hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors duration-200 shrink-0"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};