import type { LangCode } from "@/lib/i18n/dict";

export type JourneyPlannerCopy = {
  navTitle: string;
  navDescription: string;
  label: string;
  title: string;
  subtitle: string;
  calendar: string;
  notes: string;
  previous: string;
  next: string;
  today: string;
  selectedDay: string;
  noEvents: string;
  addPlan: string;
  quickLog: string;
  planTitle: string;
  details: string;
  dateTime: string;
  duration: string;
  activity: string;
  savePlan: string;
  saving: string;
  complete: string;
  skip: string;
  remove: string;
  planned: string;
  completed: string;
  skipped: string;
  cancelled: string;
  newNote: string;
  noteTitle: string;
  noteBody: string;
  tags: string;
  tagsHint: string;
  retention: string;
  forever: string;
  days30: string;
  days90: string;
  days365: string;
  aiAccess: string;
  aiAccessHint: string;
  saveNote: string;
  updateNote: string;
  edit: string;
  exportNotes: string;
  noNotes: string;
  encrypted: string;
  confirmDelete: string;
  loadError: string;
  saveError: string;
  weekdays: string[];
  activities: Record<string, string>;
};

const en: JourneyPlannerCopy = {
  navTitle: "Calendar & Private Notes",
  navDescription: "Plan practices, review your history, and keep encrypted personal notes",
  label: "Personal journey",
  title: "Calendar & Private Notes",
  subtitle: "Review completed work, plan what comes next, and keep reflections encrypted for you alone.",
  calendar: "Calendar",
  notes: "Private Notes",
  previous: "Previous",
  next: "Next",
  today: "Today",
  selectedDay: "Selected day",
  noEvents: "No activity for this day.",
  addPlan: "Plan an activity",
  quickLog: "Quickly mark as completed",
  planTitle: "Title",
  details: "Optional details",
  dateTime: "Date and time",
  duration: "Minutes",
  activity: "Activity",
  savePlan: "Save plan",
  saving: "Saving…",
  complete: "Complete",
  skip: "Skip",
  remove: "Delete",
  planned: "Planned",
  completed: "Completed",
  skipped: "Skipped",
  cancelled: "Cancelled",
  newNote: "New private note",
  noteTitle: "Note title",
  noteBody: "Write your private reflection…",
  tags: "Tags",
  tagsHint: "Comma separated, up to 10",
  retention: "Retention",
  forever: "Keep until I delete it",
  days30: "Delete after 30 days",
  days90: "Delete after 90 days",
  days365: "Delete after 1 year",
  aiAccess: "Allow this selected note for a future AI reflection I initiate",
  aiAccessHint: "Off by default. Background, content, and social agents never receive these notes.",
  saveNote: "Save encrypted note",
  updateNote: "Update encrypted note",
  edit: "Edit",
  exportNotes: "Export my notes",
  noNotes: "No private notes yet.",
  encrypted: "AES-256 encrypted · user-only",
  confirmDelete: "Permanently delete this private item?",
  loadError: "Could not load your private journey data.",
  saveError: "Could not save the change.",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  activities: { MEDITATION: "Meditation", YOGA: "Yoga", READING: "Reading", LESSON: "Lesson", PRACTICE: "Practice", JOURNAL: "Journal", REFLECTION: "Reflection", OTHER: "Other" },
};

const overrides: Partial<Record<LangCode, Partial<JourneyPlannerCopy>>> = {
  tr: {
    navTitle: "Takvim ve Kişisel Notlar", navDescription: "Çalışmalarınızı planlayın, geçmişinizi görün ve şifreli kişisel notlar tutun",
    label: "Kişisel yolculuk", title: "Takvim ve Kişisel Notlar", subtitle: "Tamamladığınız çalışmaları görün, yenilerini planlayın ve düşüncelerinizi yalnızca size açık şekilde şifreli saklayın.",
    calendar: "Takvim", notes: "Kişisel Notlar", previous: "Önceki", next: "Sonraki", today: "Bugün", selectedDay: "Seçili gün", noEvents: "Bu gün için çalışma yok.",
    addPlan: "Çalışma planla", quickLog: "Hızlıca tamamlandı işaretle", planTitle: "Başlık", details: "İsteğe bağlı ayrıntılar", dateTime: "Tarih ve saat", duration: "Dakika", activity: "Çalışma", savePlan: "Planı kaydet", saving: "Kaydediliyor…",
    complete: "Tamamla", skip: "Atla", remove: "Sil", planned: "Planlandı", completed: "Tamamlandı", skipped: "Atlandı", cancelled: "İptal edildi",
    newNote: "Yeni kişisel not", noteTitle: "Not başlığı", noteBody: "Kişisel düşüncenizi yazın…", tags: "Etiketler", tagsHint: "Virgülle ayırın, en fazla 10", retention: "Saklama süresi", forever: "Ben silene kadar sakla", days30: "30 gün sonra sil", days90: "90 gün sonra sil", days365: "1 yıl sonra sil",
    aiAccess: "Bu seçili notu yalnızca benim başlatacağım gelecekteki bir AI değerlendirmesine aç", aiAccessHint: "Varsayılan kapalıdır. Arka plan, içerik ve sosyal medya ajanları bu notları hiçbir zaman alamaz.",
    saveNote: "Şifreli notu kaydet", updateNote: "Şifreli notu güncelle", edit: "Düzenle", exportNotes: "Notlarımı dışa aktar", noNotes: "Henüz kişisel not yok.", encrypted: "AES-256 şifreli · yalnızca kullanıcı", confirmDelete: "Bu kişisel kayıt kalıcı olarak silinsin mi?", loadError: "Kişisel yolculuk verileriniz yüklenemedi.", saveError: "Değişiklik kaydedilemedi.",
    weekdays: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"], activities: { MEDITATION: "Meditasyon", YOGA: "Yoga", READING: "Okuma", LESSON: "Ders", PRACTICE: "Pratik", JOURNAL: "Günlük", REFLECTION: "Düşünme", OTHER: "Diğer" },
  },
  es: { navTitle: "Calendario y notas privadas", navDescription: "Planifica prácticas y guarda notas cifradas", label: "Viaje personal", title: "Calendario y notas privadas", subtitle: "Revisa tu progreso, planifica y guarda reflexiones cifradas.", calendar: "Calendario", notes: "Notas privadas", today: "Hoy", addPlan: "Planificar actividad", quickLog: "Marcar como completado", newNote: "Nueva nota privada", saveNote: "Guardar nota cifrada", exportNotes: "Exportar mis notas", noNotes: "Aún no hay notas privadas.", weekdays: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], activities: { MEDITATION: "Meditación", YOGA: "Yoga", READING: "Lectura", LESSON: "Lección", PRACTICE: "Práctica", JOURNAL: "Diario", REFLECTION: "Reflexión", OTHER: "Otro" } },
  de: { navTitle: "Kalender & private Notizen", navDescription: "Übungen planen und verschlüsselte Notizen führen", label: "Persönliche Reise", title: "Kalender & private Notizen", subtitle: "Fortschritt ansehen, nächste Schritte planen und Reflexionen verschlüsselt speichern.", calendar: "Kalender", notes: "Private Notizen", today: "Heute", addPlan: "Aktivität planen", quickLog: "Als erledigt markieren", newNote: "Neue private Notiz", saveNote: "Verschlüsselte Notiz speichern", exportNotes: "Notizen exportieren", noNotes: "Noch keine privaten Notizen.", weekdays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], activities: { MEDITATION: "Meditation", YOGA: "Yoga", READING: "Lesen", LESSON: "Lektion", PRACTICE: "Übung", JOURNAL: "Tagebuch", REFLECTION: "Reflexion", OTHER: "Andere" } },
  fr: { navTitle: "Calendrier et notes privées", navDescription: "Planifie tes pratiques et conserve des notes chiffrées", label: "Parcours personnel", title: "Calendrier et notes privées", subtitle: "Consulte tes progrès, planifie la suite et conserve tes réflexions chiffrées.", calendar: "Calendrier", notes: "Notes privées", today: "Aujourd'hui", addPlan: "Planifier une activité", quickLog: "Marquer comme terminé", newNote: "Nouvelle note privée", saveNote: "Enregistrer la note chiffrée", exportNotes: "Exporter mes notes", noNotes: "Aucune note privée.", weekdays: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"], activities: { MEDITATION: "Méditation", YOGA: "Yoga", READING: "Lecture", LESSON: "Leçon", PRACTICE: "Pratique", JOURNAL: "Journal", REFLECTION: "Réflexion", OTHER: "Autre" } },
  ru: { navTitle: "Календарь и личные заметки", navDescription: "Планируйте практики и храните зашифрованные заметки", label: "Личный путь", title: "Календарь и личные заметки", subtitle: "Просматривайте прогресс, планируйте и храните размышления в зашифрованном виде.", calendar: "Календарь", notes: "Личные заметки", today: "Сегодня", addPlan: "Запланировать занятие", quickLog: "Отметить выполненным", newNote: "Новая личная заметка", saveNote: "Сохранить зашифрованную заметку", exportNotes: "Экспортировать заметки", noNotes: "Личных заметок пока нет.", weekdays: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"], activities: { MEDITATION: "Медитация", YOGA: "Йога", READING: "Чтение", LESSON: "Урок", PRACTICE: "Практика", JOURNAL: "Дневник", REFLECTION: "Размышление", OTHER: "Другое" } },
  zh: { navTitle: "日历与私人笔记", navDescription: "规划练习并保存加密私人笔记", label: "个人旅程", title: "日历与私人笔记", subtitle: "查看已完成内容、规划下一步，并以加密方式保存个人反思。", calendar: "日历", notes: "私人笔记", today: "今天", addPlan: "规划活动", quickLog: "快速标记完成", newNote: "新建私人笔记", saveNote: "保存加密笔记", exportNotes: "导出我的笔记", noNotes: "暂无私人笔记。", weekdays: ["日", "一", "二", "三", "四", "五", "六"], activities: { MEDITATION: "冥想", YOGA: "瑜伽", READING: "阅读", LESSON: "课程", PRACTICE: "练习", JOURNAL: "日记", REFLECTION: "反思", OTHER: "其他" } },
  ar: { navTitle: "التقويم والملاحظات الخاصة", navDescription: "خطط للممارسات واحتفظ بملاحظات مشفرة", label: "الرحلة الشخصية", title: "التقويم والملاحظات الخاصة", subtitle: "راجع تقدمك وخطط للخطوات القادمة واحفظ تأملاتك مشفرة.", calendar: "التقويم", notes: "ملاحظات خاصة", today: "اليوم", addPlan: "تخطيط نشاط", quickLog: "تحديد كمكتمل", newNote: "ملاحظة خاصة جديدة", saveNote: "حفظ الملاحظة المشفرة", exportNotes: "تصدير ملاحظاتي", noNotes: "لا توجد ملاحظات خاصة بعد.", weekdays: ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"], activities: { MEDITATION: "تأمل", YOGA: "يوغا", READING: "قراءة", LESSON: "درس", PRACTICE: "ممارسة", JOURNAL: "يوميات", REFLECTION: "تفكير", OTHER: "أخرى" } },
};

export function getJourneyPlannerCopy(lang: LangCode): JourneyPlannerCopy {
  const localized = overrides[lang] || {};
  return {
    ...en,
    ...localized,
    activities: { ...en.activities, ...(localized.activities || {}) },
    weekdays: localized.weekdays || en.weekdays,
  };
}
