const getPhoneDigits = (phone) => String(phone || '').replace(/\D/g, '');
const formatPhone = (phone) => {
    const digits = getPhoneDigits(phone).replace(/^55/, '');
    if (digits.length < 10) return phone || '';
    const ddd = digits.slice(0, 2);
    const body = digits.slice(2);
    return `(${ddd}) ${body.slice(0, 5)} ${body.slice(5, 9)}`;
};
const firstTwoNames = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    const keep = parts.slice(0, 2);
    const looseConnectors = ['de', 'da', 'do', 'das', 'dos'];
    if (keep.length === 2 && looseConnectors.includes(normalizeText(keep[1])) && parts[2]) {
        keep.push(parts[2]);
    }
    return keep.join(' ');
};
const getRowValue = (row, field) => {
    const entries = Object.entries(row || {});
    const aliases = CONTACT_FIELDS[field];
    const match = entries.find(([key]) => aliases.some(alias => normalizeText(key).includes(normalizeText(alias))));
    return match ? match[1] : '';
};
const normalizeContactRow = (row, sheetName) => ({
    sheet: sheetName,
    area: String(getRowValue(row, 'area')).trim(),
    topologia: String(getRowValue(row, 'topologia')).trim(),
    nome: firstTwoNames(getRowValue(row, 'nome')),
    cargo: String(getRowValue(row, 'cargo')).trim(),
    telefone: formatPhone(getRowValue(row, 'telefone')),
    phoneDigits: getPhoneDigits(getRowValue(row, 'telefone')).replace(/^55/, ''),
    nivel: String(getRowValue(row, 'nivel')).trim(),
    observacoes: String(getRowValue(row, 'observacoes')).trim(),
    note: String(row.__fieldNotes?.observacoes || row.__note || '').trim()
});
const normalizeReferenceRow = (row, sheetName) => ({
    sheet: sheetName,
    area: String(getRowValue(row, 'area')).trim(),
    cluster: String(getRowValue(row, 'cluster')).trim(),
    cidade: String(getRowValue(row, 'topologia')).trim()
});
const makeContactStore = (sheets = {}, references = {}, sheetNotes = {}) => ({ sheets, references, sheetNotes });
const ensureContactStore = (value) => {
    if (Array.isArray(value)) {
        return makeContactStore(CONTACT_CLUSTERS.reduce((acc, cluster) => {
            acc[cluster] = value.filter(contact => contact.sheet === cluster || contact.cluster === cluster);
            return acc;
        }, {}), {});
    }
    return makeContactStore(value?.sheets || {}, value?.references || {}, value?.sheetNotes || {});
};
const isAlwaysVisibleContact = (cluster, contact) => {
    const normalizedArea = normalizeText(contact.area);
    if ((CONTACT_GLOBAL_AREA_RULES[cluster] || []).some(rule => normalizedArea === normalizeText(rule))) return true;
    return false;
};


const normalizeText = (text) => {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const countLinks = (item) => {
    if (!item.children) return 0;
    return item.children.reduce((acc, child) => {
        return acc + (child.type === 'link' ? 1 : countLinks(child));
    }, 0);
};

const buildSearchIndex = (items, path = []) => {
    let results = [];
    items.forEach(item => {
        if (item.type === 'link') {
            results.push({ ...item, path: [...path], searchable: normalizeText([...path, item.name].join(' ')) });
        } else if (item.type === 'folder' && item.children) {
            results.push(...buildSearchIndex(item.children, [...path, item.name]));
        }
    });
    return results;
};

const searchIndex = buildSearchIndex(bookmarkData);
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const getFirstLetter = (text) => {
    const normalized = normalizeText(text).replace(/[^a-z0-9]/g, '');
    return normalized ? normalized[0].toUpperCase() : '#';
};

const IconComponent = ({ name, size = 24, className = "" }) => {
    if (CustomIcons[name]) {
        const CustomIcon = CustomIcons[name];
        return React.createElement(CustomIcon, { size, className });
    }
    const Icon = lucide && lucide[name];
    if (!Icon) return React.createElement('span', { className: `emoji-icon ${className}` }, '•');
    return React.createElement(Icon, { size, className, strokeWidth: 1.8 });
};

const ClearSearchIcon = () => React.createElement('svg', {
    className: 'search-clear-icon',
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
}, [
    React.createElement('path', { key: 'one', d: 'M7 7l10 10' }),
    React.createElement('path', { key: 'two', d: 'M17 7L7 17' })
]);

const EmojiComponent = ({ item }) => {
    if (item.image) return React.createElement('img', { className: `custom-image-icon ${item.roundedImage ? 'rounded-brand' : ''}`, src: item.image, alt: '', 'aria-hidden': 'true' });
    if (item.brandIcon === 'copilot') return React.createElement('span', { className: 'brand-icon copilot-logo', 'aria-hidden': 'true' });
    if (item.brandIcon === 'onedrive') return React.createElement('span', { className: 'brand-icon onedrive-logo', 'aria-hidden': 'true' });
    return React.createElement('span', { className: 'emoji-icon', 'aria-hidden': 'true' }, item.emoji || (item.type === 'folder' ? '📁' : '🔗'));
};
