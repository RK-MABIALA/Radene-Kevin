'use client';

import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { weddingStore } from '@/lib/supabase/client';
import { ProjectTaskItem, TaskStatus, TaskPriority } from '@/lib/database.types';

export const KanbanBoard: React.FC = () => {
  const [tasks, setTasks] = useState<ProjectTaskItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // New task form state
  const [newTitre, setNewTitre] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAssigne, setNewAssigne] = useState('Kevin');
  const [newPriorite, setNewPriorite] = useState<TaskPriority>('moyenne');
  const [newEcheance, setNewEcheance] = useState('');

  const loadTasks = async () => {
    const list = await weddingStore.getTasks();
    setTasks(list);
  };

  useEffect(() => {
    loadTasks();
    window.addEventListener('wedding_data_changed', loadTasks);
    return () => window.removeEventListener('wedding_data_changed', loadTasks);
  }, []);

  const handleMoveStatus = async (taskId: string, nextStatus: TaskStatus) => {
    await weddingStore.saveTask({ id: taskId, statut: nextStatus });
    loadTasks();
  };

  const handleDelete = async (taskId: string) => {
    await weddingStore.deleteTask(taskId);
    loadTasks();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitre.trim()) return;

    await weddingStore.saveTask({
      titre: newTitre.trim(),
      description: newDesc.trim() || undefined,
      assigne_a: newAssigne,
      priorite: newPriorite,
      echeance: newEcheance || undefined,
      statut: 'a_faire',
    });

    setNewTitre('');
    setNewDesc('');
    setNewEcheance('');
    setIsAdding(false);
    loadTasks();
  };

  const columns: { id: TaskStatus; title: string; color: string; badgeBg: string }[] = [
    { id: 'a_faire', title: 'À Faire', color: 'border-zinc-300', badgeBg: 'bg-zinc-100 text-zinc-700' },
    { id: 'en_cours', title: 'En Cours', color: 'border-amber-400', badgeBg: 'bg-amber-100 text-amber-800' },
    { id: 'termine', title: 'Terminé', color: 'border-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
  ];

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'haute':
        return <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold uppercase">Urgente</span>;
      case 'moyenne':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">Moyenne</span>;
      case 'basse':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Basse</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gold-200/60 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-luxury text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Kanban className="w-5 h-5 text-gold-600" />
            <span>Suivi de Projet & Kanban de l'Organisation</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Coordonnez les préparatifs du mariage avec vos témoins et prestataires en temps réel.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-gold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une Tâche</span>
        </button>
      </div>

      {/* Kanban 3-column Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.statut === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-3xl p-5 bg-white dark:bg-zinc-900 border-t-4 ${col.color} border border-gold-200/60 dark:border-zinc-800 shadow-sm flex flex-col min-h-[500px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-serif-luxury text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {col.title}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${col.badgeBg}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {colTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    Aucune tâche dans cette colonne
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 shadow-sm space-y-2 hover:border-gold-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 leading-snug">
                          {task.titre}
                        </span>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-zinc-400 hover:text-rose-500 p-0.5"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700 text-[10px]">
                        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300 font-medium">
                          <User className="w-3 h-3 text-gold-600" />
                          <span>{task.assigne_a || 'Non assigné'}</span>
                        </div>
                        {getPriorityBadge(task.priorite)}
                      </div>

                      {task.echeance && (
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Échéance : {task.echeance}</span>
                        </div>
                      )}

                      {/* Movement buttons */}
                      <div className="pt-2 flex items-center justify-between gap-1">
                        {col.id !== 'a_faire' ? (
                          <button
                            onClick={() => handleMoveStatus(task.id, col.id === 'termine' ? 'en_cours' : 'a_faire')}
                            className="p-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 text-[10px] flex items-center gap-1"
                            title="Reculer d'une étape"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        ) : <div />}

                        {col.id !== 'termine' && (
                          <button
                            onClick={() => handleMoveStatus(task.id, col.id === 'a_faire' ? 'en_cours' : 'termine')}
                            className="px-2 py-1 rounded bg-gold-500 hover:bg-gold-600 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors"
                            title="Avancer vers l'étape suivante"
                          >
                            <span>Avancer</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gold-300 shadow-2xl">
            <h3 className="font-serif-luxury text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Nouvelle Tâche Mariage
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Intitulé de la Tâche *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Confirmer le timing de la pièce montée"
                  value={newTitre}
                  onChange={(e) => setNewTitre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description / Consignes
                </label>
                <textarea
                  rows={2}
                  placeholder="Détails, liens ou contacts nécessaires..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Assigné à
                  </label>
                  <select
                    value={newAssigne}
                    onChange={(e) => setNewAssigne(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                  >
                    <option value="Radene">👰 Radene</option>
                    <option value="Kevin">🤵 Kevin</option>
                    <option value="Radene & Kévin">👰🤵 Radene & Kévin</option>
                    <option value="Vos amis">👗 Vos amis </option>
                    <option value="Protocole & Accueil">🎟️ Protocole & Accueil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Priorité
                  </label>
                  <select
                    value={newPriorite}
                    onChange={(e) => setNewPriorite(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                  >
                    <option value="haute">🔥 Haute / Urgente</option>
                    <option value="moyenne">⚡ Moyenne</option>
                    <option value="basse">🌱 Basse</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Date d'Échéance
                </label>
                <input
                  type="date"
                  value={newEcheance}
                  onChange={(e) => setNewEcheance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gold-500 text-white text-xs font-semibold uppercase tracking-wider"
                >
                  Créer la Tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
