import type { Locale } from "next-intl";

/**
 * The La Dolce Vita brand story, curated copy provided by the owners.
 *
 * Deliberately static and bilingual rather than database-backed: the two catalogues
 * carry the short neutral placeholder strings, but this is the real story and it is
 * identical on every visit, so it lives as typed data next to the code that renders
 * it. `en` embeds one Arabic line ("عاصمة الثقافة والفن، مدينة الحب والحضارة") as a
 * deliberate editorial accent; `ar` renders the same idea in its own flow.
 *
 * Block model:
 *   - `body`  - a normal prose paragraph.
 *   - `lead`  - a short emphatic line rendered in the display face. `lang`/`dir`
 *               are set when the line is intentionally from the other language
 *               (the Arabic accent inside the English page).
 */

export type AboutStoryBlock =
  | { readonly kind: "body"; readonly text: string }
  | { readonly kind: "lead"; readonly text: string; readonly lang?: "ar"; readonly dir?: "rtl" };

export interface AboutStory {
  readonly title: string;
  readonly subtitle: string;
  readonly blocks: readonly AboutStoryBlock[];
}

const english: AboutStory = {
  title: "La Dolce Vita",
  subtitle: "A love letter to Aleppo.",
  blocks: [
    {
      kind: "body",
      text: "La Dolce Vita is a new lifestyle destination in the heart of Aleppo — a space born from our love for the city we grew up in, and our belief in everything it still has to offer.",
    },
    { kind: "lead", text: "Aleppo has always been more than a city." },
    {
      kind: "lead",
      text: "عاصمة الثقافة والفن، مدينة الحب والحضارة.",
      lang: "ar",
      dir: "rtl",
    },
    {
      kind: "body",
      text: "A city shaped by creativity, craftsmanship, hospitality, music, food, stories and a way of life that has always brought people together.",
    },
    {
      kind: "body",
      text: "La Dolce Vita is our window into that lifestyle — a place where the different sides of modern Syrian life can meet, connect and grow.",
    },
    {
      kind: "body",
      text: "From Aleppo’s first boutique Reformer Pilates studio, to our community and study spaces, music installations and outdoor area for slowing down over matcha, fresh smoothies and coffee — every corner is designed around a simple idea: to enjoy life, together.",
    },
    {
      kind: "body",
      text: "Through Casa Alla Moda, our curated home and gift concept, we also celebrate Syrian creativity by bringing together handmade pieces from local designers, artists and makers alongside carefully selected home accessories.",
    },
    {
      kind: "lead",
      text: "But La Dolce Vita is not only about the spaces inside it.",
    },
    { kind: "lead", text: "It is about the people around it." },
    {
      kind: "body",
      text: "We believe in building a network with the initiatives, creatives, artists, entrepreneurs and communities shaping Aleppo today. Through workshops, gatherings and collaborations, we want to create a place that gives people a reason to meet, learn, create and share.",
    },
    {
      kind: "body",
      text: "A place that reflects the Aleppo we know — its warmth, its creativity, its culture, its elegance, and its spirit.",
    },
    {
      kind: "body",
      text: "La Dolce Vita is our way of bringing a little more of that Aleppine way of life back into everyday life.",
    },
    {
      kind: "lead",
      text: "Because sometimes, the sweetest life is the one that already belonged to us.",
    },
  ],
};

const arabic: AboutStory = {
  title: "لا دولتشي فيتا",
  subtitle: "رسالة حب إلى حلب.",
  blocks: [
    {
      kind: "body",
      text: "لا دولتشي فيتا وجهة جديدة لنمط حياة مميز في قلب حلب، مساحة ولدت من حبنا للمدينة التي نشأنا فيها، وإيماننا بكل ما لا تزال تقدمه.",
    },
    { kind: "lead", text: "لطالما كانت حلب أكثر من مجرد مدينة." },
    {
      kind: "body",
      text: "مدينة تشكلت من خلال الإبداع، والحرفية، وكرم الضيافة، والموسيقى، والطعام، والقصص، وأسلوب حياة لطالما جمع الناس.",
    },
    {
      kind: "body",
      text: "لا دولتشي فيتا نافذتنا على هذا النمط من الحياة، مكان تلتقي فيه مختلف جوانب الحياة السورية المعاصرة، وتتواصل، وتنمو.",
    },
    {
      kind: "body",
      text: "من أول استوديو بوتيكي لرياضة بيلاتس ريفورمر في حلب، إلى مساحاتنا المجتمعية والدراسية، وتجهيزاتنا الموسيقية، ومساحتنا الخارجية للاسترخاء مع الماتشا، والعصائر الطازجة، والقهوة، صُمم كل ركن حول فكرة بسيطة: الاستمتاع بالحياة معًا.",
    },
    {
      kind: "body",
      text: "من خلال “كازا آلا مودا”، مفهومنا المختار بعناية للأثاث المنزلي والهدايا، نحتفي بالإبداع السوري عبر جمع قطع يدوية الصنع من تصميم فنانين وحرفيين محليين، إلى جانب إكسسوارات منزلية مختارة بعناية.",
    },
    {
      kind: "lead",
      text: "لكن “لا دولتشي فيتا” لا تقتصر على المساحات الداخلية فحسب،",
    },
    { kind: "lead", text: "بل هي أيضاً عن الناس المحيطين بها." },
    {
      kind: "body",
      text: "نؤمن ببناء شبكة تواصل مع المبادرات والمبدعين والفنانين ورواد الأعمال والمجتمعات التي تُشكّل حلب اليوم. من خلال ورش العمل واللقاءات والتعاون، نسعى لخلق مكان يُتيح للناس فرصة اللقاء والتعلم والإبداع والمشاركة.",
    },
    {
      kind: "body",
      text: "مكان يعكس حلب التي نعرفها - دفئها، إبداعها، ثقافتها، أناقتها، وروحها.",
    },
    {
      kind: "body",
      text: "“لا دولتشي فيتا” هي طريقتنا لإعادة جزء من نمط الحياة الحلبي إلى حياتنا اليومية.",
    },
    {
      kind: "lead",
      text: "لأن أحياناً، تكون أجمل حياة هي تلك التي عشناها بالفعل.",
    },
  ],
};

/** The official brand story for a locale. */
export function getAboutStory(locale: Locale): AboutStory {
  return locale === "ar" ? arabic : english;
}
