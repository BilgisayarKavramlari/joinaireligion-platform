"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LangCode } from "@/lib/i18n/dict";

type Orientation = "clarify" | "soften" | "connect" | "practice";
type Copy = {
  eyebrow: string; title: string; intro: string; privacy: string;
  questions: Array<{ text: string; options: Array<{ label: string; value: Orientation }> }>;
  next: string; back: string; resultEyebrow: string; resultTitle: string;
  results: Record<Orientation, { title: string; body: string; prompt: string }>;
  share: string; restart: string; copied: string; read: string; disclaimer: string;
};

const en: Copy = {
  eyebrow: "A three-minute reflection",
  title: "Meaning Map",
  intro: "Notice what may support you right now. This is a momentary reflection, not a diagnosis, identity, or fixed spiritual label.",
  privacy: "Your answers stay only in this browser tab. They are not sent to our server or included when you share.",
  questions: [
    { text: "What feels most useful right now?", options: [
      { label: "A clearer question", value: "clarify" }, { label: "More gentleness", value: "soften" },
      { label: "A sense of connection", value: "connect" }, { label: "One grounded action", value: "practice" },
    ] },
    { text: "When uncertainty appears, what would help first?", options: [
      { label: "Name what is uncertain", value: "clarify" }, { label: "Make room for the feeling", value: "soften" },
      { label: "Hear another perspective", value: "connect" }, { label: "Return to breath or movement", value: "practice" },
    ] },
    { text: "Which small shift feels possible today?", options: [
      { label: "Write one honest sentence", value: "clarify" }, { label: "Release one harsh expectation", value: "soften" },
      { label: "Reach out with curiosity", value: "connect" }, { label: "Pause for three mindful minutes", value: "practice" },
    ] },
  ],
  next: "Continue", back: "Back", resultEyebrow: "A possible next step", resultTitle: "Your reflection for this moment",
  results: {
    clarify: { title: "Clarify the living question", body: "You may benefit from making the question smaller and more honest before trying to solve it.", prompt: "What is the simplest true question beneath everything else?" },
    soften: { title: "Make room before making meaning", body: "A gentler stance may create enough space for insight to emerge without force.", prompt: "What changes if I meet this moment without judging it?" },
    connect: { title: "Let meaning be relational", body: "Another perspective or a sincere conversation may reveal what solitary analysis cannot.", prompt: "Who or what helps me see this with greater care?" },
    practice: { title: "Return insight to the body", body: "A small embodied action may be more useful now than another abstract answer.", prompt: "What three-minute practice can I actually do today?" },
  },
  share: "Invite someone", restart: "Reflect again", copied: "Invitation link copied", read: "Explore related reflections",
  disclaimer: "Educational reflection only — not therapy, diagnosis, religious authority, or professional advice.",
};

const copies: Partial<Record<LangCode, Copy>> = {
  en,
  tr: { ...en,
    eyebrow: "Üç dakikalık bir düşünme", title: "Anlam Haritası",
    intro: "Şu anda sana neyin destek olabileceğini fark et. Bu, geçici bir düşünme alanıdır; tanı, kimlik veya sabit bir manevi etiket değildir.",
    privacy: "Yanıtların yalnızca bu tarayıcı sekmesinde kalır. Sunucumuza gönderilmez ve paylaşımına eklenmez.",
    questions: [
      { text: "Şu anda en yararlı olan ne?", options: [{ label: "Daha açık bir soru", value: "clarify" }, { label: "Daha fazla şefkat", value: "soften" }, { label: "Bağ kurma hissi", value: "connect" }, { label: "Ayakları yere basan bir adım", value: "practice" }] },
      { text: "Belirsizlik ortaya çıktığında önce ne yardımcı olur?", options: [{ label: "Belirsiz olanı adlandırmak", value: "clarify" }, { label: "Duyguya alan açmak", value: "soften" }, { label: "Başka bir bakışı dinlemek", value: "connect" }, { label: "Nefese veya harekete dönmek", value: "practice" }] },
      { text: "Bugün hangi küçük değişim mümkün görünüyor?", options: [{ label: "Dürüst bir cümle yazmak", value: "clarify" }, { label: "Sert bir beklentiyi bırakmak", value: "soften" }, { label: "Merakla birine ulaşmak", value: "connect" }, { label: "Üç dakika bilinçli durmak", value: "practice" }] },
    ],
    next: "Devam et", back: "Geri", resultEyebrow: "Olası bir sonraki adım", resultTitle: "Bu ana ait düşünmen",
    results: {
      clarify: { title: "Canlı soruyu berraklaştır", body: "Çözmeye çalışmadan önce soruyu daha küçük ve daha dürüst hâle getirmek yararlı olabilir.", prompt: "Diğer her şeyin altındaki en basit gerçek soru ne?" },
      soften: { title: "Anlam vermeden önce alan aç", body: "Daha şefkatli bir duruş, içgörünün zorlamadan ortaya çıkmasına yer açabilir.", prompt: "Bu anı yargılamadan karşılasam ne değişir?" },
      connect: { title: "Anlamın ilişkisel olmasına izin ver", body: "Başka bir bakış veya samimi bir konuşma, tek başına analizin göremediğini gösterebilir.", prompt: "Kim veya ne, bunu daha özenli görmeme yardım eder?" },
      practice: { title: "İçgörüyü bedene geri getir", body: "Küçük ve bedensel bir eylem, şu anda başka bir soyut yanıttan daha yararlı olabilir.", prompt: "Bugün gerçekten yapabileceğim üç dakikalık pratik ne?" },
    },
    share: "Birini davet et", restart: "Yeniden düşün", copied: "Davet bağlantısı kopyalandı", read: "İlgili yazıları keşfet",
    disclaimer: "Yalnızca eğitsel düşünme içindir; terapi, tanı, dini otorite veya profesyonel tavsiye değildir.",
  },
  es: { ...en,
    eyebrow: "Una reflexión de tres minutos", title: "Mapa de significado", intro: "Observa qué podría ayudarte ahora. Es una reflexión momentánea, no un diagnóstico, identidad ni etiqueta espiritual fija.", privacy: "Tus respuestas permanecen solo en esta pestaña. No se envían al servidor ni se incluyen al compartir.",
    questions: [
      { text: "¿Qué sería más útil ahora?", options: [{ label: "Una pregunta más clara", value: "clarify" }, { label: "Más amabilidad", value: "soften" }, { label: "Sentir conexión", value: "connect" }, { label: "Una acción concreta", value: "practice" }] },
      { text: "Cuando aparece la incertidumbre, ¿qué ayudaría primero?", options: [{ label: "Nombrar lo incierto", value: "clarify" }, { label: "Dar espacio a la emoción", value: "soften" }, { label: "Escuchar otra perspectiva", value: "connect" }, { label: "Volver a la respiración", value: "practice" }] },
      { text: "¿Qué pequeño cambio parece posible hoy?", options: [{ label: "Escribir una frase honesta", value: "clarify" }, { label: "Soltar una expectativa dura", value: "soften" }, { label: "Acercarme con curiosidad", value: "connect" }, { label: "Pausar tres minutos", value: "practice" }] },
    ], next: "Continuar", back: "Atrás", resultEyebrow: "Un posible siguiente paso", resultTitle: "Tu reflexión para este momento",
    results: { clarify: { title: "Aclara la pregunta viva", body: "Puede ayudarte hacer la pregunta más pequeña y honesta antes de resolverla.", prompt: "¿Cuál es la pregunta verdadera más sencilla bajo todo lo demás?" }, soften: { title: "Haz espacio antes de dar significado", body: "Una actitud más amable puede dejar surgir la comprensión sin forzarla.", prompt: "¿Qué cambia si recibo este momento sin juzgarlo?" }, connect: { title: "Deja que el significado sea relacional", body: "Otra perspectiva puede mostrar lo que el análisis solitario no ve.", prompt: "¿Quién o qué me ayuda a mirar esto con más cuidado?" }, practice: { title: "Devuelve la comprensión al cuerpo", body: "Una acción corporal pequeña puede ser más útil que otra respuesta abstracta.", prompt: "¿Qué práctica de tres minutos puedo hacer hoy?" } },
    share: "Invitar a alguien", restart: "Reflexionar de nuevo", copied: "Enlace copiado", read: "Explorar reflexiones", disclaimer: "Solo reflexión educativa; no es terapia, diagnóstico, autoridad religiosa ni consejo profesional.",
  },
  de: { ...en,
    eyebrow: "Eine dreiminütige Reflexion", title: "Bedeutungskarte", intro: "Nimm wahr, was dich jetzt unterstützen könnte. Dies ist eine momentane Reflexion, keine Diagnose, Identität oder feste spirituelle Einordnung.", privacy: "Deine Antworten bleiben nur in diesem Browser-Tab. Sie werden weder gesendet noch beim Teilen übermittelt.",
    questions: [
      { text: "Was wäre jetzt am hilfreichsten?", options: [{ label: "Eine klarere Frage", value: "clarify" }, { label: "Mehr Freundlichkeit", value: "soften" }, { label: "Ein Gefühl von Verbindung", value: "connect" }, { label: "Eine konkrete Handlung", value: "practice" }] },
      { text: "Was hilft zuerst, wenn Unsicherheit auftaucht?", options: [{ label: "Das Ungewisse benennen", value: "clarify" }, { label: "Dem Gefühl Raum geben", value: "soften" }, { label: "Eine andere Sicht hören", value: "connect" }, { label: "Zu Atem oder Bewegung zurückkehren", value: "practice" }] },
      { text: "Welche kleine Veränderung ist heute möglich?", options: [{ label: "Einen ehrlichen Satz schreiben", value: "clarify" }, { label: "Eine harte Erwartung loslassen", value: "soften" }, { label: "Neugierig Kontakt aufnehmen", value: "connect" }, { label: "Drei Minuten innehalten", value: "practice" }] },
    ], next: "Weiter", back: "Zurück", resultEyebrow: "Ein möglicher nächster Schritt", resultTitle: "Deine Reflexion für diesen Moment",
    results: { clarify: { title: "Die lebendige Frage klären", body: "Es kann helfen, die Frage kleiner und ehrlicher zu machen, bevor du sie löst.", prompt: "Was ist die einfachste wahre Frage unter allem anderen?" }, soften: { title: "Raum schaffen, bevor Bedeutung entsteht", body: "Eine freundlichere Haltung kann Einsicht ohne Zwang entstehen lassen.", prompt: "Was ändert sich, wenn ich diesen Moment nicht bewerte?" }, connect: { title: "Bedeutung in Beziehung entstehen lassen", body: "Eine andere Perspektive kann zeigen, was einsame Analyse übersieht.", prompt: "Wer oder was hilft mir, dies sorgsamer zu sehen?" }, practice: { title: "Einsicht in den Körper zurückbringen", body: "Eine kleine verkörperte Handlung kann nützlicher sein als eine weitere abstrakte Antwort.", prompt: "Welche dreiminütige Praxis kann ich heute tun?" } },
    share: "Jemanden einladen", restart: "Neu reflektieren", copied: "Link kopiert", read: "Reflexionen entdecken", disclaimer: "Nur zur Bildungsreflexion; keine Therapie, Diagnose, religiöse Autorität oder professionelle Beratung.",
  },
  fr: { ...en,
    eyebrow: "Une réflexion de trois minutes", title: "Carte du sens", intro: "Observez ce qui pourrait vous soutenir maintenant. C’est une réflexion momentanée, ni diagnostic, ni identité, ni étiquette spirituelle fixe.", privacy: "Vos réponses restent uniquement dans cet onglet. Elles ne sont ni envoyées au serveur ni incluses dans le partage.",
    questions: [
      { text: "Qu’est-ce qui serait le plus utile maintenant ?", options: [{ label: "Une question plus claire", value: "clarify" }, { label: "Plus de douceur", value: "soften" }, { label: "Un sentiment de lien", value: "connect" }, { label: "Une action concrète", value: "practice" }] },
      { text: "Quand l’incertitude apparaît, qu’est-ce qui aiderait d’abord ?", options: [{ label: "Nommer l’incertain", value: "clarify" }, { label: "Faire place à l’émotion", value: "soften" }, { label: "Écouter un autre point de vue", value: "connect" }, { label: "Revenir au souffle", value: "practice" }] },
      { text: "Quel petit changement semble possible aujourd’hui ?", options: [{ label: "Écrire une phrase honnête", value: "clarify" }, { label: "Relâcher une attente sévère", value: "soften" }, { label: "Aller vers l’autre avec curiosité", value: "connect" }, { label: "Faire une pause de trois minutes", value: "practice" }] },
    ], next: "Continuer", back: "Retour", resultEyebrow: "Une prochaine étape possible", resultTitle: "Votre réflexion pour cet instant",
    results: { clarify: { title: "Clarifier la question vivante", body: "Réduire et rendre la question plus honnête peut aider avant de la résoudre.", prompt: "Quelle est la question vraie la plus simple sous tout le reste ?" }, soften: { title: "Faire de la place avant de donner du sens", body: "Une posture plus douce peut laisser l’intuition émerger sans contrainte.", prompt: "Que change le fait d’accueillir cet instant sans le juger ?" }, connect: { title: "Laisser le sens devenir relationnel", body: "Un autre point de vue peut révéler ce que l’analyse solitaire ne voit pas.", prompt: "Qui ou quoi m’aide à voir cela avec plus de soin ?" }, practice: { title: "Ramener l’intuition dans le corps", body: "Une petite action incarnée peut être plus utile qu’une autre réponse abstraite.", prompt: "Quelle pratique de trois minutes puis-je réellement faire aujourd’hui ?" } },
    share: "Inviter quelqu’un", restart: "Recommencer", copied: "Lien copié", read: "Explorer les réflexions", disclaimer: "Réflexion éducative uniquement ; ni thérapie, diagnostic, autorité religieuse ou conseil professionnel.",
  },
  ar: { ...en,
    eyebrow: "تأمل لثلاث دقائق", title: "خريطة المعنى", intro: "لاحظ ما قد يدعمك الآن. هذا تأمل لحظي، وليس تشخيصًا أو هوية أو تصنيفًا روحيًا ثابتًا.", privacy: "تبقى إجاباتك في علامة التبويب هذه فقط. لا تُرسل إلى خادمنا ولا تُضمّن عند المشاركة.",
    questions: [
      { text: "ما الأكثر فائدة الآن؟", options: [{ label: "سؤال أوضح", value: "clarify" }, { label: "مزيد من اللطف", value: "soften" }, { label: "إحساس بالتواصل", value: "connect" }, { label: "خطوة عملية واحدة", value: "practice" }] },
      { text: "عند ظهور عدم اليقين، ما الذي يساعد أولًا؟", options: [{ label: "تسمية ما هو غير مؤكد", value: "clarify" }, { label: "إفساح مجال للشعور", value: "soften" }, { label: "سماع منظور آخر", value: "connect" }, { label: "العودة إلى التنفس أو الحركة", value: "practice" }] },
      { text: "أي تحول صغير ممكن اليوم؟", options: [{ label: "كتابة جملة صادقة", value: "clarify" }, { label: "ترك توقع قاسٍ", value: "soften" }, { label: "التواصل بفضول", value: "connect" }, { label: "التوقف الواعي ثلاث دقائق", value: "practice" }] },
    ], next: "متابعة", back: "رجوع", resultEyebrow: "خطوة تالية محتملة", resultTitle: "تأملك لهذه اللحظة",
    results: { clarify: { title: "وضّح السؤال الحي", body: "قد يفيد تصغير السؤال وجعله أكثر صدقًا قبل محاولة حله.", prompt: "ما أبسط سؤال حقيقي تحت كل شيء آخر؟" }, soften: { title: "افسح مجالًا قبل صنع المعنى", body: "قد يتيح موقف ألطف للبصيرة أن تظهر دون إجبار.", prompt: "ماذا يتغير إن قابلت هذه اللحظة دون حكم؟" }, connect: { title: "دع المعنى ينشأ في العلاقة", body: "قد يكشف منظور آخر ما لا يراه التحليل المنفرد.", prompt: "من أو ما يساعدني على رؤية هذا بعناية أكبر؟" }, practice: { title: "أعد البصيرة إلى الجسد", body: "قد يكون فعل جسدي صغير أنفع من إجابة مجردة أخرى.", prompt: "ما ممارسة الثلاث دقائق التي أستطيع فعلها اليوم؟" } },
    share: "دعوة شخص", restart: "التأمل مجددًا", copied: "تم نسخ الرابط", read: "استكشاف تأملات", disclaimer: "للتأمل التعليمي فقط؛ ليس علاجًا أو تشخيصًا أو سلطة دينية أو نصيحة مهنية.",
  },
  ru: { ...en,
    eyebrow: "Трёхминутная рефлексия", title: "Карта смысла", intro: "Заметьте, что может поддержать вас сейчас. Это краткая рефлексия, а не диагноз, идентичность или постоянный духовный ярлык.", privacy: "Ответы остаются только в этой вкладке. Они не отправляются на сервер и не включаются в ссылку.",
    questions: [
      { text: "Что сейчас было бы полезнее всего?", options: [{ label: "Более ясный вопрос", value: "clarify" }, { label: "Больше мягкости", value: "soften" }, { label: "Чувство связи", value: "connect" }, { label: "Одно конкретное действие", value: "practice" }] },
      { text: "Что поможет первым при неопределённости?", options: [{ label: "Назвать неизвестное", value: "clarify" }, { label: "Дать место чувству", value: "soften" }, { label: "Услышать иной взгляд", value: "connect" }, { label: "Вернуться к дыханию", value: "practice" }] },
      { text: "Какой небольшой сдвиг возможен сегодня?", options: [{ label: "Написать честное предложение", value: "clarify" }, { label: "Отпустить жёсткое ожидание", value: "soften" }, { label: "Обратиться с любопытством", value: "connect" }, { label: "Осознанно остановиться на три минуты", value: "practice" }] },
    ], next: "Продолжить", back: "Назад", resultEyebrow: "Возможный следующий шаг", resultTitle: "Рефлексия для этого момента",
    results: { clarify: { title: "Проясните живой вопрос", body: "Полезно сделать вопрос меньше и честнее, прежде чем решать его.", prompt: "Какой самый простой правдивый вопрос лежит под всем остальным?" }, soften: { title: "Создайте пространство до поиска смысла", body: "Более мягкое отношение позволяет пониманию появиться без давления.", prompt: "Что изменится, если встретить этот момент без осуждения?" }, connect: { title: "Позвольте смыслу быть отношением", body: "Другой взгляд может открыть то, чего не видит одиночный анализ.", prompt: "Кто или что помогает увидеть это бережнее?" }, practice: { title: "Верните понимание в тело", body: "Небольшое телесное действие может быть полезнее ещё одного абстрактного ответа.", prompt: "Какую трёхминутную практику я могу сделать сегодня?" } },
    share: "Пригласить", restart: "Начать снова", copied: "Ссылка скопирована", read: "Открыть рефлексии", disclaimer: "Только образовательная рефлексия; не терапия, диагноз, религиозный авторитет или профессиональный совет.",
  },
  zh: { ...en,
    eyebrow: "三分钟反思", title: "意义地图", intro: "觉察此刻什么可能支持你。这只是当下的反思，不是诊断、身份或固定的精神标签。", privacy: "你的回答只保留在此浏览器标签页中，不会发送到服务器，也不会包含在分享链接里。",
    questions: [
      { text: "此刻什么最有帮助？", options: [{ label: "一个更清晰的问题", value: "clarify" }, { label: "更多温柔", value: "soften" }, { label: "一种联结感", value: "connect" }, { label: "一个踏实的行动", value: "practice" }] },
      { text: "不确定出现时，首先什么会有帮助？", options: [{ label: "说出不确定之处", value: "clarify" }, { label: "给感受留出空间", value: "soften" }, { label: "听取另一种视角", value: "connect" }, { label: "回到呼吸或动作", value: "practice" }] },
      { text: "今天哪一个小转变是可能的？", options: [{ label: "写下一句诚实的话", value: "clarify" }, { label: "放下一个苛刻期待", value: "soften" }, { label: "带着好奇去联系", value: "connect" }, { label: "专注停顿三分钟", value: "practice" }] },
    ], next: "继续", back: "返回", resultEyebrow: "一个可能的下一步", resultTitle: "属于此刻的反思",
    results: { clarify: { title: "澄清正在发生的问题", body: "在解决之前，把问题变小、变得更诚实，也许会有帮助。", prompt: "在其他一切之下，最简单而真实的问题是什么？" }, soften: { title: "赋予意义之前先留出空间", body: "更温柔的姿态能让洞见不受强迫地出现。", prompt: "如果不评判地面对这一刻，会有什么变化？" }, connect: { title: "让意义在关系中形成", body: "另一种视角可能揭示独自分析看不到的东西。", prompt: "谁或什么能帮助我更用心地看待它？" }, practice: { title: "让洞见回到身体", body: "一个小小的身体行动，可能比另一个抽象答案更有用。", prompt: "今天我真正能做的三分钟练习是什么？" } },
    share: "邀请他人", restart: "再次反思", copied: "邀请链接已复制", read: "探索相关反思", disclaimer: "仅用于教育性反思；不是治疗、诊断、宗教权威或专业建议。",
  },
};

function track(event: string, locale: string) {
  void fetch("/api/meaning-map/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, locale }),
    keepalive: true,
  });
}

export function MeaningMapExperience() {
  const { lang } = useLanguage();
  const copy = copies[lang] ?? en;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Orientation[]>([]);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => { track("view", lang); }, [lang]);
  const result = useMemo<Orientation | null>(() => {
    if (answers.length !== copy.questions.length) return null;
    const counts = { clarify: 0, soften: 0, connect: 0, practice: 0 };
    answers.forEach((answer) => { counts[answer] += 1; });
    return (Object.keys(counts) as Orientation[]).sort((a, b) => counts[b] - counts[a])[0];
  }, [answers, copy.questions.length]);

  function choose(value: Orientation) {
    if (!started.current) { started.current = true; track("start", lang); }
    const nextAnswers = [...answers.slice(0, step), value];
    setAnswers(nextAnswers);
    if (step < copy.questions.length - 1) setStep(step + 1);
    else track("complete", lang);
  }

  async function share() {
    const url = "https://joinaireligion.com/meaning-map?invite=1";
    const data = { title: copy.title, text: copy.intro, url };
    if (navigator.share) await navigator.share(data).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    }
    track("share", lang);
  }

  if (result) {
    const resultCopy = copy.results[result];
    return (
      <main className="meaning-map-shell">
        <section className="meaning-map-result sacred-card" aria-live="polite">
          <p className="topic-hub-eyebrow">{copy.resultEyebrow}</p>
          <h1 className="font-sacred">{copy.resultTitle}</h1>
          <div className="meaning-map-orbit" aria-hidden><span>✦</span></div>
          <h2>{resultCopy.title}</h2>
          <p>{resultCopy.body}</p>
          <blockquote>{resultCopy.prompt}</blockquote>
          <div className="meaning-map-actions">
            <button type="button" className="btn-sacred btn-sacred-gold" onClick={() => void share()}>{copied ? copy.copied : copy.share}</button>
            <button type="button" className="btn-sacred btn-sacred-ghost" onClick={() => { setAnswers([]); setStep(0); setCopied(false); started.current = false; }}>{copy.restart}</button>
            <Link className="btn-sacred btn-sacred-violet" href="/content/topics">{copy.read}</Link>
          </div>
          <small>{copy.privacy}</small>
          <small>{copy.disclaimer}</small>
        </section>
      </main>
    );
  }

  const question = copy.questions[step];
  return (
    <main className="meaning-map-shell">
      <section className="meaning-map-card sacred-card">
        <p className="topic-hub-eyebrow">{copy.eyebrow}</p>
        <h1 className="font-sacred">{copy.title}</h1>
        <p className="meaning-map-intro">{copy.intro}</p>
        <p className="meaning-map-privacy">◎ {copy.privacy}</p>
        <div className="meaning-map-progress" aria-label={`${step + 1} / ${copy.questions.length}`}><span style={{ width: `${((step + 1) / copy.questions.length) * 100}%` }} /></div>
        <fieldset>
          <legend>{question.text}</legend>
          <div className="meaning-map-options">
            {question.options.map((option) => <button type="button" key={option.label} onClick={() => choose(option.value)}>{option.label}<span aria-hidden>→</span></button>)}
          </div>
        </fieldset>
        {step > 0 && <button type="button" className="meaning-map-back" onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -1)); }}>← {copy.back}</button>}
        <small>{copy.disclaimer}</small>
      </section>
    </main>
  );
}
