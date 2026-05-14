const lucide = window.lucide;

const USERS = [
    { username: 'Kelly Lira', role: 'admin', group: 'residencial', displayName: 'Kelly Lira' },
    { username: 'Nelson Leandro', role: 'admin', group: 'residencial', displayName: 'Nelson Leandro' },
    { username: 'Cristiane Hermógenes', role: 'user', group: 'residencial', displayName: 'Cristiane Hermógenes' },
    { username: 'Raissa Cardoso', role: 'user', group: 'residencial', displayName: 'Raissa Cardoso' },
    { username: 'Alan Marinho', role: 'user', group: 'residencial', displayName: 'Alan Marinho' },
    { username: 'Maristella Márcia', role: 'user', group: 'residencial', displayName: 'Maristella Márcia' },
    { username: 'Thiago Velhinho', role: 'user', group: 'residencial', displayName: 'Thiago Velhinho' },
    { username: 'Leonardo Almeida', role: 'user', group: 'residencial', displayName: 'Leonardo Almeida' }
];

const USER_GROUPS = [
    { id: 'residencial', name: 'Residencial' }
];

const CONTACT_CLUSTERS = ['BA', 'NE', 'NO', 'CO', 'MG', 'ES', 'RJ'];
const CONTACT_GLOBAL_AREA_RULES = {
    BA: ['BA/SE'],
    NO: ['NO'],
    CO: ['CO'],
    MG: ['MG']
};
const CONTACT_FIELDS = {
    area: ['area', 'área', 'estado'],
    topologia: ['topologia', 'cidade', 'municipio', 'município', 'localidade'],
    nome: ['nome', 'responsavel', 'responsável'],
    cargo: ['cargo', 'funcao', 'função'],
    telefone: ['telefone', 'celular', 'whatsapp', 'contato'],
    nivel: ['nivel', 'nível'],
    observacoes: ['observacoes', 'observações', 'observacao', 'observação', 'comentario', 'comentário'],
    cluster: ['cluster']
};


const CustomIcons = {
    WhatsApp: ({ size = 28, className = "" }) => React.createElement('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', className
    }, [
        React.createElement('path', { key: 'p1', d: 'M12 21a8.7 8.7 0 0 1-4.4-1.2L3 21l1.3-4.4A8.7 8.7 0 1 1 12 21Z' }),
        React.createElement('path', { key: 'p2', d: 'M9.2 8.8c.2-.5.4-.5.8-.5h.6c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c-.1.1-.2.3-.1.5.4.8 1.1 1.5 2 1.9.2.1.4.1.5-.1l.5-.6c.2-.2.4-.3.7-.2l1.6.8c.3.1.4.3.4.6 0 .5-.1.9-.4 1.2-.4.4-1.1.6-1.7.5-3.3-.5-6-3.1-6.5-6.3-.1-.4.1-.8.4-1Z' })
    ])
};

// ==================== NOVA BOOKMARK DATA (REORGANIZADA) ====================
