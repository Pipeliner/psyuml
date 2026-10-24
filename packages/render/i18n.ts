/**
 * Renderer-chrome message catalog (issue #3, ADR-0059).
 *
 * "Chrome" is every string a renderer adds ITSELF — legends, captions, headers, edge/node
 * decorations (EXIT, as-if, TRAP), stereotype captions, default titles, blank-template prompts.
 * Model content (labels, `meta.title`, `meta.disclaimer`) is localized by the model's own label
 * dictionaries via `getText`, never here.
 *
 * - `EN` is the source of truth: its keys define `ChromeKey`, and every other locale is typed
 *   `Record<ChromeKey, string>`, so a locale missing a string is a compile error.
 * - Lookup resolves the BCP-47 base subtag (`ru-RU` → `ru`) and falls back to `en` for a locale
 *   with no catalog, so an unsupported `lang` renders exactly as before.
 * - `{name}` placeholders are interpolated from `vars`; `i18n.test.ts` checks that every locale
 *   carries the same placeholders as `en`.
 *
 * HONEST SCOPE: the `ru` strings are a careful working translation of interface chrome, NOT a
 * professionally validated clinical translation (see ADR-0042's honesty constraint). Alt-text
 * (`<desc>` / `aria-label`) is still composed in English — recorded as the remaining gap.
 */

const EN = {
  // Shared decorations
  'edge.exit': 'EXIT',
  'node.asIf': 'as-if',
  'crisis.default': 'If you are in danger now, call your local emergency number or a crisis line.',

  // Default <title> when the model has no meta.title
  'title.stateMap': 'State map',
  'title.partsMap': 'Parts map',
  'title.decisionNav': 'Crisis chart',
  'title.resourceAnchor': 'Resource map',
  'title.processLoop': 'Loop map',
  'title.timeline': 'Timeline',
  'title.interventionSequence': 'Intervention sequence',
  'title.ritual': 'Ritual structure',
  'title.relationalField': 'Relational field',
  'title.modeMap': 'Schema mode map',
  'title.bodyMap': 'Body map',
  'title.twoTriangles': 'Two triangles',
  'title.ladder': 'Ranked ladder',
  'title.threeCircles': 'Three circles (CFT)',
  'title.venn': 'Overlapping circles',
  'title.bullseye': "Values bull's-eye",
  'title.treeOfLife': 'Tree of Life',
  'title.schemaGrid': 'Schema-domains grid',
  'title.decisionalBalance': 'Decisional balance',
  'title.secureBase': 'Secure base & safe haven',
  'title.composite': 'Composite board',

  // State map
  'state.legend.transition': 'transition (what leads here)',
  'state.legend.exit': 'exit — a way out',
  'state.legend.bands': 'Bands are ordered top → bottom; patterns (not colour) mark the zones.',

  // Parts map
  'parts.barrier': 'dissociative barrier',
  'parts.legend':
    '◎ Self · ○ part · ( ) containment orbit · ═ dissociative barrier · dotted = protects · zigzag = conflict',
  'parts.contestedVs': 'vs',
  'stereotype.manager': 'manager',
  'stereotype.firefighter': 'firefighter',
  'stereotype.exile': 'exile',

  // Decision / navigation chart
  'decision.crisisHeader': 'Crisis resources (always available):',

  // Resource map
  'resource.legend': 'CFT systems: Threat · Drive · Soothing — grow the soothing system.',

  // Process loop
  'loop.trap': 'TRAP',
  'loop.dilemma': 'DILEMMA',
  'loop.snag': 'SNAG',

  // Timeline
  'timeline.action': 'ACTION',
  'timeline.identity': 'IDENTITY',
  'timeline.past': 'problem-saturated past',
  'timeline.future': 'preferred future →',

  // Ritual
  'ritual.framing': 'Honest framing:',
  'ritual.secular': 'Secular variant:',

  // Relational field
  'relational.legend':
    '□ male · ○ female · ◇ other · ▭ system · ═ fused · zigzag = conflict · dashed = distant · ‖ cutoff · ⋯○ = origin (nested)',

  // Mode map
  'mode.grow': '↑ grow',
  'mode.dominance': 'dom {value}',
  'mode.legend':
    'Circle size = mode dominance (number shown). Goal: grow the Healthy Adult, shrink maladaptive modes.',

  // Body map
  'body.caption':
    'Marker size = intensity (number shown). Body sensations are meaningful but not self-explanatory — pace and titrate.',
  'body.wholeBody': 'Whole body',

  // Two triangles
  'twoTriangles.legend':
    'solid = within-triangle link · dotted = transference (same conflict, new relationship)',

  // Ladder
  'ladder.harder': 'harder',
  'ladder.easier': 'easier',
  'ladder.footer':
    'Climb at your own pace — master a rung before moving up; the bottom rung is where to start.',

  // Three circles (CFT)
  'threeCircles.threat': 'protect',
  'threeCircles.drive': 'pursue',
  'threeCircles.soothing': 'rest & connect',
  'threeCircles.legend':
    'Three systems (Gilbert): grow the soothing system — it balances threat and drive.',

  // Venn
  'venn.legend': 'Two circles, one overlap: the middle region is what both share.',

  // Bullseye
  'bullseye.legend':
    'Each dot is a life area; closer to the centre = living more like that value matters to you.',

  // Tree of Life
  'tree.branches': 'Branches — my hopes, dreams & wishes',
  'tree.leaves': 'Leaves — the important people in my life',
  'tree.fruits': "Fruits — gifts I've been given",
  'tree.trunk': 'Trunk — my skills & values',
  'tree.ground': 'Ground — my present, day to day',
  'tree.roots': 'Roots — where I come from',
  'tree.footer':
    "A strengths-based life portrait, co-created — what's here is what you chose to put here.",

  // Schema grid (Young's five schema domains)
  'schema.disconnection': 'Disconnection & Rejection',
  'schema.autonomy': 'Impaired Autonomy & Performance',
  'schema.limits': 'Impaired Limits',
  'schema.otherDirected': 'Other-Directedness',
  'schema.overvigilance': 'Overvigilance & Inhibition',
  'schema.legend':
    "Columns: Young's 5 schema domains. Outline weight and bar = intensity (number shown); wedge (▟) + bold name = active (≥ 0.5).",

  // Decisional balance
  'balance.change': 'Making the change',
  'balance.stay': 'Staying the same',
  'balance.benefits': 'Benefits / hopes',
  'balance.costs': 'Costs / worries',
  'balance.caveat':
    'Use when genuinely weighing both sides — dwelling on reasons to stay can deepen ambivalence (MI-3), so it is not a persuasion tool.',

  // Secure base
  'secureBase.base': 'SECURE BASE — support me going out to explore',
  'secureBase.haven': 'SAFE HAVEN — welcome me back for comfort',
  'secureBase.footer':
    'A trusted caregiver is both — somewhere safe to go FROM, and somewhere safe to come BACK to.',

  // Blank printable template (fill-in prompts)
  'template.title': '{diagram} (blank template)',
  'template.state': '(state…)',
  'template.agent': '(part…)',
  'template.self': '(Self / centre)',
  'template.resource': '(resource…)',
  'template.intervention': '(step…)',
  'template.context': '(context…)',
  'template.temporal': '(when…)',
  'template.other': '(…)',

  // Diff progress card
  'diff.title': 'Progress',
  'diff.none': 'No tracked changes.',
  'diff.renamed': 'Renamed “{before}” → “{after}”',
  'diff.kindLink': '{kind} link',
  'diff.link': 'link {id}',

  // Composite board
  'composite.threads': 'Shared threads (cross-navigation)',
  'composite.threadLine': '• {label} ({id}) — in {views}',
  'composite.noThreads': '(no shared threads across these views)',
} as const;

/** Every renderer-chrome string id. */
export type ChromeKey = keyof typeof EN;
/** A complete locale: one string per `ChromeKey`. */
export type ChromeCatalog = Readonly<Record<ChromeKey, string>>;

const RU: ChromeCatalog = {
  'edge.exit': 'ВЫХОД',
  'node.asIf': 'как будто',
  'crisis.default':
    'Если вам сейчас угрожает опасность, позвоните в местную экстренную службу или на кризисную линию.',

  'title.stateMap': 'Карта состояний',
  'title.partsMap': 'Карта частей',
  'title.decisionNav': 'Кризисная схема',
  'title.resourceAnchor': 'Карта ресурсов',
  'title.processLoop': 'Карта цикла',
  'title.timeline': 'Линия времени',
  'title.interventionSequence': 'Последовательность вмешательств',
  'title.ritual': 'Структура ритуала',
  'title.relationalField': 'Поле отношений',
  'title.modeMap': 'Карта режимов схем',
  'title.bodyMap': 'Карта тела',
  'title.twoTriangles': 'Два треугольника',
  'title.ladder': 'Лестница',
  'title.threeCircles': 'Три круга (CFT)',
  'title.venn': 'Пересекающиеся круги',
  'title.bullseye': 'Мишень ценностей',
  'title.treeOfLife': 'Дерево жизни',
  'title.schemaGrid': 'Сетка доменов схем',
  'title.decisionalBalance': 'Баланс решения',
  'title.secureBase': 'Надёжная база и тихая гавань',
  'title.composite': 'Сводная доска',

  'state.legend.transition': 'переход (что ведёт сюда)',
  'state.legend.exit': 'выход — путь наружу',
  'state.legend.bands': 'Полосы идут сверху вниз; зоны обозначены узором (не цветом).',

  'parts.barrier': 'диссоциативный барьер',
  'parts.legend':
    '◎ Самость · ○ часть · ( ) орбита сдерживания · ═ диссоциативный барьер · пунктир = защищает · зигзаг = конфликт',
  'parts.contestedVs': 'против',
  'stereotype.manager': 'менеджер',
  'stereotype.firefighter': 'пожарный',
  'stereotype.exile': 'изгнанник',

  'decision.crisisHeader': 'Кризисная помощь (доступна всегда):',

  'resource.legend':
    'Системы CFT: угроза · стремление · успокоение — развивайте систему успокоения.',

  'loop.trap': 'ЛОВУШКА',
  'loop.dilemma': 'ДИЛЕММА',
  'loop.snag': 'ПРЕПЯТСТВИЕ',

  'timeline.action': 'ДЕЙСТВИЕ',
  'timeline.identity': 'ИДЕНТИЧНОСТЬ',
  'timeline.past': 'прошлое под властью проблемы',
  'timeline.future': 'желаемое будущее →',

  'ritual.framing': 'Честная рамка:',
  'ritual.secular': 'Светская версия:',

  'relational.legend':
    '□ мужчина · ○ женщина · ◇ другое · ▭ система · ═ слияние · зигзаг = конфликт · штрих = дистанция · ‖ разрыв · ⋯○ = происхождение (вложено)',

  'mode.grow': '↑ растить',
  'mode.dominance': 'дом. {value}',
  'mode.legend':
    'Размер круга = доминирование режима (число указано). Цель: укрепить Здорового взрослого, ослабить дезадаптивные режимы.',

  'body.caption':
    'Размер метки = интенсивность (число указано). Телесные ощущения значимы, но не объясняют себя сами — соблюдайте темп и дозируйте.',
  'body.wholeBody': 'Всё тело',

  'twoTriangles.legend':
    'сплошная = связь внутри треугольника · пунктир = перенос (тот же конфликт, новые отношения)',

  'ladder.harder': 'труднее',
  'ladder.easier': 'легче',
  'ladder.footer':
    'Поднимайтесь в своём темпе — освойте ступень, прежде чем идти выше; начинайте с нижней ступени.',

  'threeCircles.threat': 'защита',
  'threeCircles.drive': 'стремление',
  'threeCircles.soothing': 'отдых и связь',
  'threeCircles.legend':
    'Три системы (Гилберт): развивайте систему успокоения — она уравновешивает угрозу и стремление.',

  'venn.legend': 'Два круга, одно пересечение: средняя область — то, что у них общее.',

  'bullseye.legend':
    'Каждая точка — сфера жизни; чем ближе к центру, тем больше вы живёте в согласии с этой ценностью.',

  'tree.branches': 'Ветви — мои надежды, мечты и желания',
  'tree.leaves': 'Листья — важные люди в моей жизни',
  'tree.fruits': 'Плоды — то, что мне подарили',
  'tree.trunk': 'Ствол — мои навыки и ценности',
  'tree.ground': 'Земля — моё настоящее, день за днём',
  'tree.roots': 'Корни — откуда я родом',
  'tree.footer':
    'Портрет жизни через сильные стороны, созданный вместе — здесь то, что вы сами решили сюда поместить.',

  'schema.disconnection': 'Разобщённость и отвержение',
  'schema.autonomy': 'Нарушение автономии и деятельности',
  'schema.limits': 'Нарушение границ',
  'schema.otherDirected': 'Направленность на других',
  'schema.overvigilance': 'Сверхбдительность и подавление',
  'schema.legend':
    'Столбцы — 5 доменов схем Янга. Толщина рамки и полоса = интенсивность (число указано); уголок (▟) и жирное имя = активна (≥ 0,5).',

  'balance.change': 'Изменить',
  'balance.stay': 'Оставить как есть',
  'balance.benefits': 'Плюсы / надежды',
  'balance.costs': 'Минусы / опасения',
  'balance.caveat':
    'Используйте, только когда обе стороны действительно взвешиваются: застревание на причинах ничего не менять может усилить амбивалентность (MI-3), поэтому это не инструмент убеждения.',

  'secureBase.base': 'НАДЁЖНАЯ БАЗА — поддержи меня, когда я ухожу исследовать',
  'secureBase.haven': 'ТИХАЯ ГАВАНЬ — прими меня обратно, чтобы утешить',
  'secureBase.footer':
    'Надёжный взрослый — и то и другое: безопасное место, ОТКУДА можно уйти, и безопасное место, КУДА можно вернуться.',

  'template.title': '{diagram} (пустой шаблон)',
  'template.state': '(состояние…)',
  'template.agent': '(часть…)',
  'template.self': '(Самость / центр)',
  'template.resource': '(ресурс…)',
  'template.intervention': '(шаг…)',
  'template.context': '(контекст…)',
  'template.temporal': '(когда…)',
  'template.other': '(…)',

  'diff.title': 'Прогресс',
  'diff.none': 'Нет отслеживаемых изменений.',
  'diff.renamed': 'Переименовано «{before}» → «{after}»',
  'diff.kindLink': 'связь {kind}',
  'diff.link': 'связь {id}',

  'composite.threads': 'Общие нити (перекрёстная навигация)',
  'composite.threadLine': '• {label} ({id}) — в {views}',
  'composite.noThreads': '(у этих видов нет общих нитей)',
};

/** The chrome catalogs by base language subtag. `en` is the fallback for any other locale. */
export const CHROME_LOCALES: Readonly<Record<string, ChromeCatalog>> = { en: EN, ru: RU };

/** The catalog language used for `lang`: its base subtag if a catalog exists, else `en`. */
export function chromeLocale(lang: string | undefined): string {
  const base = (lang || '').toLowerCase().split('-')[0];
  return Object.prototype.hasOwnProperty.call(CHROME_LOCALES, base) ? base : 'en';
}

/** Look up one chrome string for `lang` (en fallback), interpolating `{name}` from `vars`. */
export function chromeText(
  lang: string | undefined,
  key: ChromeKey,
  vars: Record<string, string | number> = {},
): string {
  const s = CHROME_LOCALES[chromeLocale(lang)][key] ?? EN[key];
  return s.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

/** A translator bound to one language — what each renderer uses for its chrome. */
export type Translate = (key: ChromeKey, vars?: Record<string, string | number>) => string;
export function translator(lang: string | undefined): Translate {
  return (key, vars) => chromeText(lang, key, vars);
}
