'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Users,
  Move,
  Save,
  Sparkles,
  Info,
  CheckCircle,
  UserX,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { weddingStore } from '@/lib/supabase/client';
import { TableItem, GuestItem, TableForm } from '@/lib/database.types';

export const TablePlanCanvas: React.FC = () => {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAddingTable, setIsAddingTable] = useState(false);

  // New Table Form
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacite, setNewTableCapacite] = useState(8);
  const [newTableForme, setNewTableForme] = useState<TableForm>('ronde');
  const [newTableZone, setNewTableZone] = useState('Salle Principale');
  const [newTableColor, setNewTableColor] = useState('#B89355');

  const canvasRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    const [tList, gList] = await Promise.all([
      weddingStore.getTables(),
      weddingStore.getGuests(),
    ]);
    setTables(tList);
    setGuests(gList);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('wedding_data_changed', loadData);
    return () => window.removeEventListener('wedding_data_changed', loadData);
  }, []);

  // Compute guests assigned per table
  const guestsByTable = (tableId: string) => {
    return guests.filter((g) => g.table_id === tableId && g.statut_rsvp !== 'decline');
  };

  const unassignedConfirmedGuests = guests.filter(
    (g) => !g.table_id && g.statut_rsvp !== 'decline'
  );

  const totalCapacity = tables.reduce((acc, t) => acc + t.capacite, 0);
  const totalAssignedPeople = guests
    .filter((g) => g.table_id && g.statut_rsvp !== 'decline')
    .reduce((acc, g) => acc + (g.nombre_invites || 1), 0);

  // Dragging handlers
  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTableId(tableId);
    setIsDragging(tableId);

    const table = tables.find((t) => t.id === tableId);
    if (table && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDragOffset({
        x: mouseX - table.coordonnees_x_y.x,
        y: mouseY - table.coordonnees_x_y.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.max(20, Math.min(rect.width - 120, mouseX - dragOffset.x));
    const newY = Math.max(20, Math.min(rect.height - 120, mouseY - dragOffset.y));

    setTables((prev) =>
      prev.map((t) =>
        t.id === isDragging
          ? { ...t, coordonnees_x_y: { ...t.coordonnees_x_y, x: newX, y: newY } }
          : t
      )
    );
  };

  const handleMouseUp = async () => {
    if (isDragging) {
      const movedTable = tables.find((t) => t.id === isDragging);
      if (movedTable) {
        await weddingStore.saveTable(movedTable);
      }
      setIsDragging(null);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    const created = await weddingStore.saveTable({
      nom_numero: newTableName.trim(),
      capacite: newTableCapacite,
      forme: newTableForme,
      zone: newTableZone,
      couleur: newTableColor,
      coordonnees_x_y: { x: 300, y: 200, rotation: 0 },
    });

    setTables([...tables, created]);
    setSelectedTableId(created.id);
    setIsAddingTable(false);
    setNewTableName('');
  };

  const handleDeleteTable = async (tableId: string) => {
    if (window.confirm('Voulez-vous supprimer cette table ? Les invités assignés redeviendront non assignés.')) {
      await weddingStore.deleteTable(tableId);
      // unassign guests
      const tableGuests = guests.filter((g) => g.table_id === tableId);
      for (const g of tableGuests) {
        await weddingStore.saveGuest({ id: g.id, table_id: null });
      }
      setSelectedTableId(null);
      loadData();
    }
  };

  const handleAssignGuest = async (guestId: string, tableId: string) => {
    await weddingStore.saveGuest({ id: guestId, table_id: tableId });
    loadData();
  };

  const handleUnassignGuest = async (guestId: string) => {
    await weddingStore.saveGuest({ id: guestId, table_id: null });
    loadData();
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const selectedTableGuests = selectedTableId ? guestsByTable(selectedTableId) : [];
  const selectedTableOccupancy = selectedTableGuests.reduce((acc, g) => acc + (g.nombre_invites || 1), 0);

  return (
    <div className="space-y-6">
      {/* 1. Header & Occupancy Progress */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gold-200/60 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-gold-600" />
            <span>Plan de Salle 2D Vectoriel Interactif</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Déplacez les tables librement par glisser-déposer et assignez vos invités par table.
          </p>
        </div>

        {/* Global Progress */}
        <div className="w-full md:w-72 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-zinc-600 dark:text-zinc-400">Places Occupées</span>
            <span className="text-gold-700 dark:text-gold-300 font-bold">
              {totalAssignedPeople} / {totalCapacity} places ({Math.round((totalAssignedPeople / (totalCapacity || 1)) * 100)}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-500 to-gold-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalAssignedPeople / (totalCapacity || 1)) * 100)}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => setIsAddingTable(true)}
          className="px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-gold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une Table</span>
        </button>
      </div>

      {/* 2. Main 2D Floor Plan Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Zone (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-zinc-900 border-2 border-gold-400/40 shadow-xl overflow-hidden relative">
          {/* Floor grid pattern */}
          <div
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-[580px] relative select-none cursor-crosshair overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(184, 147, 85, 0.15) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#12141A',
            }}
          >
            {/* Stage / Estrade Marker */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 px-6 py-1 rounded-b-xl bg-gold-500/20 border-b border-x border-gold-500/40 text-gold-300 text-[10px] uppercase font-bold tracking-widest pointer-events-none">
              ✨ Estrade des Mariés & Scène DJ ✨
            </div>

            {/* Tables on canvas */}
            {tables.map((table) => {
              const tableGuests = guestsByTable(table.id);
              const count = tableGuests.reduce((acc, g) => acc + (g.nombre_invites || 1), 0);
              const isSelected = selectedTableId === table.id;
              const isFull = count >= table.capacite;

              return (
                <div
                  key={table.id}
                  onMouseDown={(e) => handleMouseDown(table.id, e)}
                  style={{
                    left: `${table.coordonnees_x_y.x}px`,
                    top: `${table.coordonnees_x_y.y}px`,
                  }}
                  className={`absolute cursor-move transition-shadow ${
                    isSelected ? 'z-30 ring-4 ring-gold-400 ring-offset-2 ring-offset-zinc-900' : 'z-10'
                  }`}
                >
                  {/* Table Shape */}
                  <div
                    style={{ backgroundColor: table.couleur || '#B89355' }}
                    className={`text-white shadow-2xl p-4 flex flex-col items-center justify-center text-center transition-transform hover:scale-105 active:scale-95 ${
                      table.forme === 'ronde'
                        ? 'w-28 h-28 rounded-full'
                        : table.forme === 'ovale'
                        ? 'w-36 h-24 rounded-full'
                        : 'w-32 h-24 rounded-2xl'
                    }`}
                  >
                    <span className="font-serif-luxury font-bold text-xs leading-tight line-clamp-2 drop-shadow">
                      {table.nom_numero}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                        isFull ? 'bg-emerald-900/80 text-emerald-200' : 'bg-black/40 text-white'
                      }`}
                    >
                      {count} / {table.capacite} p.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-950 text-zinc-400 text-[11px] flex items-center justify-between border-t border-zinc-800">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-gold-500" />
              <span>Cliquez et glissez une table pour ajuster sa position dans la salle</span>
            </span>
            <span>{tables.length} tables disposées</span>
          </div>
        </div>

        {/* 3. Side Panel (Selected Table & Unassigned Guests) (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Selected Table Detail Card */}
          {selectedTable ? (
            <div className="glass-card-gold rounded-3xl p-6 shadow-gold space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gold-700 bg-gold-100 px-2 py-0.5 rounded-full">
                    Table Sélectionnée
                  </span>
                  <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    {selectedTable.nom_numero}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Zone : {selectedTable.zone || 'Salle Principale'} • Forme {selectedTable.forme}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteTable(selectedTable.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Supprimer la table"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Table occupancy badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-gold-200 text-xs font-semibold">
                <span>Remplissage :</span>
                <span className={selectedTableOccupancy > selectedTable.capacite ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                  {selectedTableOccupancy} / {selectedTable.capacite} places assignées
                </span>
              </div>

              {/* Assigned Guests List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                  Invités placés ({selectedTableGuests.length}) :
                </h4>
                {selectedTableGuests.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-center text-xs text-zinc-400">
                    Aucun invité assigné à cette table pour le moment.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {selectedTableGuests.map((g) => (
                      <div
                        key={g.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                            {g.prenom} {g.nom}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {g.nombre_invites} pers.{g.allergies ? ` • ⚠️ ${g.allergies}` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnassignGuest(g.id)}
                          className="text-zinc-400 hover:text-rose-500 p-1"
                          title="Retirer de la table"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-gold-200/60 text-center text-xs text-zinc-500">
              Cliquez sur une table sur le canevas pour voir son placement et y affecter des invités.
            </div>
          )}

          {/* Unassigned Guests Waiting List */}
          <div className="glass-card-gold rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-luxury text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Invités sans Table ({unassignedConfirmedGuests.length})
              </h3>
            </div>

            {unassignedConfirmedGuests.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs text-center font-medium">
                🎉 Félicitations ! Tous les invités confirmés ont une table assignée.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {unassignedConfirmedGuests.map((g) => (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        {g.prenom} {g.nom}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {g.nombre_invites} pers. • {g.statut_rsvp}
                      </span>
                    </div>

                    {selectedTableId && (
                      <button
                        onClick={() => handleAssignGuest(g.id, selectedTableId)}
                        className="px-2.5 py-1 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Placer ici +
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Table Modal */}
      {isAddingTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gold-300 shadow-2xl">
            <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Créer une Nouvelle Table
            </h3>

            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom ou Numéro de la Table *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Table 6 - Belle Époque"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Capacité (Places)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={newTableCapacite}
                    onChange={(e) => setNewTableCapacite(parseInt(e.target.value) || 8)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Forme
                  </label>
                  <select
                    value={newTableForme}
                    onChange={(e) => setNewTableForme(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                  >
                    <option value="ronde">Ronde</option>
                    <option value="rectangulaire">Rectangulaire</option>
                    <option value="ovale">Ovale</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Zone de la Salle
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aile Ouest, Terrasse, Salle Principale"
                  value={newTableZone}
                  onChange={(e) => setNewTableZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingTable(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gold-500 text-white text-xs font-semibold uppercase tracking-wider"
                >
                  Créer la Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
