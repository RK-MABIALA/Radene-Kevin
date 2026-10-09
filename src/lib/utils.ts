import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import confetti from "canvas-confetti";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, formatStyle: "short" | "full" | "time" = "full"): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    if (formatStyle === "time") {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    if (formatStyle === "short") {
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    }
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string): string {
  return formatDate(dateString, "time");
}

export function triggerConfetti() {
  if (typeof window === "undefined") return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ["#B89355", "#E8D8BF", "#6E9072", "#CE7C6C", "#FAF7F0"],
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

export function generateQrUid(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "RK-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function exportGuestsToCsv(guests: any[], tables: any[] = []) {
  if (typeof window === "undefined" || !guests.length) return;

  const tableMap = new Map(tables.map((t) => [t.id, t.nom_numero]));

  const headers = [
    "Nom",
    "Prénom",
    "Email",
    "Téléphone",
    "Statut RSVP",
    "Régime & Allergies",
    "Nombre Personnes",
    "Accompagnants",
    "Table",
    "QR Code UID",
    "Pointé / Check-in",
    "Heure Pointage",
    "Navette",
    "Hébergement",
    "Message aux Mariés",
  ];

  const rows = guests.map((g) => {
    const tableNom = g.table_id ? tableMap.get(g.table_id) || "Non assigné" : "Non assigné";
    const accompagnantsStr = Array.isArray(g.accompagnants_json)
      ? g.accompagnants_json.map((a: any) => `${a.prenom} ${a.nom}`).join(" | ")
      : "";

    return [
      `"${g.nom || ""}"`,
      `"${g.prenom || ""}"`,
      `"${g.email || ""}"`,
      `"${g.telephone || ""}"`,
      `"${g.statut_rsvp || "en_attente"}"`,
      `"${(g.allergies || "").replace(/"/g, '""')}"`,
      g.nombre_invites || 1,
      `"${accompagnantsStr.replace(/"/g, '""')}"`,
      `"${tableNom.replace(/"/g, '""')}"`,
      `"${g.qr_code_uid || ""}"`,
      g.checked_in ? "OUI" : "NON",
      `"${g.checked_in_at ? formatDate(g.checked_in_at, "full") : ""}"`,
      g.navette_requise ? "OUI" : "NON",
      g.hebergement_requis ? "OUI" : "NON",
      `"${(g.message_maries || "").replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `invites_mariage_radene_kevin_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
