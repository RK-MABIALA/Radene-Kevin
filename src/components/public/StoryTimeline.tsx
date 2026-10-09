'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, Calendar, BookmarkCheck } from 'lucide-react';

export interface MilestoneItem {
  date: string;
  displayDate: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imagePosition?: string;
  tag: string;
}

export const REAL_STORY_MILESTONES: MilestoneItem[] = [
  {
    date: '08/05/2023',
    displayDate: '8 Mai 2023',
    title: 'Premier Contact',
    subtitle: 'L’Aube de notre Histoire',
    description:
      'Le premier échange, les premiers sourires et cette douce évidence que Dieu guidait nos pas l’un vers l’autre. Le tout début d’une aventure guidée par la Pureté et l’Amour.',
    image: '/img/couple-17.jpg',
    imagePosition: 'center 45%',
    tag: 'La Rencontre',
  },
  {
    date: '05/06/2023',
    displayDate: '5 Juin 2023',
    title: 'Fiançailles',
    subtitle: 'La Promesse du Cœur',
    description:
      'L’officialisation de nos sentiments et l’engagement de marcher ensemble. Une promesse d’amour sincère, portée par la foi et la complicité grandissante.',
    image: '/img/couple-4.jpg',
    imagePosition: 'center 58%',
    tag: 'L’Engagement',
  },
  {
    date: '02/01/2025',
    displayDate: '2 Janvier 2025',
    title: 'Projet de Mariage (Jour de l’Anniversaire)',
    subtitle: 'Un Anniversaire Inoubliable',
    description:
      'En ce jour béni d’anniversaire, notre projet de vie s’est illuminé. Une demande émouvante et la décision sacrée d’unir nos cœurs devant Dieu et nos familles.',
    image: '/img/couple-14.jpg',
    imagePosition: 'center 32%',
    tag: 'Le Grand OUI',
  },
  {
    date: '21/08/2026',
    displayDate: '21 Août 2026',
    title: 'La Cérémonie de la Dot',
    subtitle: 'L’Honneur & La Bénédiction Familiale',
    description:
      'L’union précieuse de nos deux familles dans le respect chaleureux de nos traditions, un moment empreint de bénédictions, de partage et de respect fraternel.',
    image: '/img/couple-12.jpg',
    imagePosition: 'center 28%',
    tag: 'Tradition & Noblesse',
  },
  {
    date: '21/08/2026',
    displayDate: '21 Août 2026',
    title: 'L’État Civil',
    subtitle: 'Unis devant la Loi',
    description:
      'La signature officielle de notre alliance républicaine, entourés de nos témoins de vie et de nos proches, scellant juridiquement notre vie à deux.',
    image: '/img/couple-16.jpg',
    imagePosition: 'center 32%',
    tag: 'Union Civile',
  },
  {
    date: '05/12/2026',
    displayDate: 'Samedi 5 Décembre 2026',
    title: 'Bénédiction Nuptiale',
    subtitle: 'L’Union Sacrée devant Dieu',
    description:
      'Célébration solennelle du sacrement de mariage à l’Eglise Protestante du Sénégal (Paroisse de Dieuppeul à 11h00), suivie de la soirée de gala royale à la salle Fun Time à Dakar.',
    image: '/img/couple-1.jpg',
    imagePosition: 'center 20%',
    tag: 'Le Sacrement',
  },
];

export const StoryTimeline: React.FC = () => {
  return (
    <section
      id="histoire"
      className="py-24 px-4 bg-paper-textured relative overflow-hidden paper-texture"
    >
      {/* Subtle watercolor washes (Royal Blue & Champagne Gold) */}
      <div className="absolute top-1/4 -right-28 w-[500px] h-[500px] bg-royal-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-28 w-[500px] h-[500px] bg-gold-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative fine geometric gold lines in background */}
      <div className="absolute inset-x-0 top-12 flex justify-center pointer-events-none">
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-royal-50 dark:bg-royal-950/60 border border-gold-300 text-royal-800 dark:text-gold-300 text-xs uppercase tracking-widest font-semibold mb-4 shadow-sm"
          >
            <Heart className="w-3.5 h-3.5 text-royal-600 fill-royal-600 dark:text-gold-400 dark:fill-gold-400" />
            <span>Pureté • Amour • Charité</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif-luxury text-4xl sm:text-5xl lg:text-6xl text-royal-900 dark:text-zinc-50 font-normal tracking-tight"
          >
            Notre Histoire d’Amour
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-serif-luxury italic text-lg sm:text-xl text-royal-800/80 dark:text-zinc-300 mt-3"
          >
            Chaque étape franchie est une grâce divine qui nous mène vers notre sacrement.
          </motion.p>

          <div className="mt-6 flex justify-center">
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
          </div>
        </div>

        {/* Timeline Container */}
        <div className="relative">
          {/* Vertical central metallic gold line */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 top-8 bottom-8 w-[2px] bg-gradient-to-b from-gold-300 via-gold-500 to-royal-600 shadow-sm" />

          <div className="space-y-14 sm:space-y-20">
            {REAL_STORY_MILESTONES.map((milestone, index) => {
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={`${milestone.date}-${index}`}
                  initial={{ opacity: 0, y: 45 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.8, delay: index * 0.12 }}
                  className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''
                    }`}
                >
                  {/* Content Card */}
                  <div className="w-full md:w-1/2 p-2 sm:p-5">
                    <div className="glass-card-gold rounded-3xl p-6 sm:p-8 hover:shadow-gold-glow transition-all duration-500 group border border-gold-300/70 hover:border-gold-500 bg-white/95">
                      {/* Badge Date & Tag */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gold-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-royal-700 dark:text-gold-400" />
                          <span className="font-serif-luxury text-2xl sm:text-3xl font-bold text-royal-900 dark:text-gold-300">
                            {milestone.date}
                          </span>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-royal-50 dark:bg-royal-950 border border-royal-200/60 dark:border-gold-500/30 text-[11px] font-bold uppercase tracking-wider text-royal-800 dark:text-gold-200">
                          {milestone.tag}
                        </span>
                      </div>

                      {/* Photo Preview */}
                      <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden mb-5 shadow-sm border border-gold-200 group-hover:border-gold-400 transition-colors bg-zinc-100">
                        <img
                          src={milestone.image}
                          alt={milestone.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          style={{ objectPosition: milestone.imagePosition || 'center 35%' }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-royal-950/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute bottom-3 left-3 text-white text-xs font-medium tracking-wider drop-shadow-md">
                          {milestone.displayDate}
                        </div>
                      </div>

                      {/* Title and Subtitle */}
                      <h3 className="font-serif-luxury text-2xl sm:text-3xl text-royal-950 dark:text-zinc-50 font-semibold mb-1">
                        {milestone.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-royal-700 dark:text-gold-300 font-medium mb-3">
                        <BookmarkCheck className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                        <span>{milestone.subtitle}</span>
                      </div>

                      {/* Description */}
                      <p className="text-royal-950/80 dark:text-zinc-300 text-sm leading-relaxed font-sans">
                        {milestone.description}
                      </p>
                    </div>
                  </div>

                  {/* Central Node / Marker */}
                  <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-royal-950 border-2 border-gold-500 shadow-gold flex items-center justify-center text-royal-700 dark:text-gold-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5 text-gold-600 fill-gold-300" />
                    </div>
                  </div>

                  {/* Empty Spacer for Desktop balance */}
                  <div className="hidden md:block w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
