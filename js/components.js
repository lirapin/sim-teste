const AppCard = ({ item, onFolderOpen }) => {
    const isFolder = item.type === 'folder';
    const handleClick = () => {
        if (isFolder && onFolderOpen) onFolderOpen(item);
        else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
    };
    return React.createElement('button', { type: 'button', className: `${isFolder ? 'folder-card' : 'app-card'} fade-in`, onClick: handleClick }, [
        React.createElement('div', { key: 'icon', className: 'icon-wrapper' }, React.createElement(EmojiComponent, { item })),
        React.createElement('div', { key: 'name', className: 'app-name' }, item.name.length > 35 ? item.name.substring(0, 32) + '...' : item.name)
    ]);
};

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        const loginName = normalizeText(username.trim());
        if (!loginName || !password.trim()) {
            setError('Informe login e senha');
            return;
        }
        const user = USERS.find(u => normalizeText(u.username) === loginName);
        if (user) onLogin(user);
        else setError('Usuário não encontrado');
    };
    return React.createElement('div', { className: 'min-h-screen flex items-center justify-center p-5', style: { background: '#d1d5db' } },
        React.createElement('form', { onSubmit: handleSubmit, className: 'login-card p-8 w-full max-w-sm' }, [
            React.createElement('div', { key: 'logo', className: 'mx-auto w-16 h-16 flex items-center justify-center mb-4' }, React.createElement('img', { className: 'login-logo', src: 'assets/icons/icons8-owl-100.png', alt: 'SIM' })),
            React.createElement('h1', { key: 'title', className: 'text-2xl font-bold text-center text-red-700 mb-1' }, 'SIM'),
            React.createElement('p', { key: 'sub', className: 'text-center text-sm text-gray-500 mb-6' }, 'Sistema Integrado Madrugada'),
            React.createElement('input', { key: 'user', type: 'text', className: 'search-input mb-3', placeholder: 'Login', value: username, onChange: (e) => setUsername(e.target.value) }),
            React.createElement('input', { key: 'pass', type: 'password', className: 'search-input mb-3', placeholder: 'Senha', value: password, onChange: (e) => setPassword(e.target.value) }),
            error && React.createElement('p', { key: 'error', className: 'text-sm text-red-600 mb-3 text-center' }, error),
            React.createElement('button', { key: 'btn', type: 'submit', className: 'w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl py-3 transition-all' }, 'Entrar')
        ])
    );
};

const CategoryTabs = ({ categories, activeCategory, onSelect }) => {
    return React.createElement('div', { className: 'category-tabs scrollbar-hide' },
        categories.map(cat => React.createElement('button', { key: cat.name, onClick: () => onSelect(cat.name), className: `tab-button ${activeCategory === cat.name ? 'active' : ''}` }, cat.name))
    );
};

const SearchResults = ({ searchTerm }) => {
    const normalizedSearch = normalizeText(searchTerm);
    const results = React.useMemo(() => {
        if (!normalizedSearch) return [];
        return searchIndex.filter(item => normalizeText(item.name).includes(normalizedSearch) || item.searchable.includes(normalizedSearch));
    }, [normalizedSearch]);
    if (results.length === 0) {
        return React.createElement('div', { className: 'text-center py-20' }, [
            React.createElement(IconComponent, { key: 'icon', name: 'Search', size: 48, className: 'mx-auto text-gray-400 mb-4' }),
            React.createElement('p', { key: 'text', className: 'text-gray-500' }, `Nenhum resultado encontrado para "${searchTerm}"`)
        ]);
    }
    return React.createElement('div', { className: 'tray-inner' },
        React.createElement('div', { className: 'grid-apps fade-in' }, results.map((result, idx) => React.createElement(AppCard, { key: `${result.name}-${idx}`, item: result })))
    );
};

const FolderView = ({ folder, onOpenFolder, onBack }) => {
    const [folderSearch, setFolderSearch] = React.useState('');
    const [activeLetter, setActiveLetter] = React.useState('');
    const isSearchableFolder = !!folder.searchableFolder;
    const normalizedFolderSearch = normalizeText(folderSearch);
    const availableLetters = React.useMemo(() => {
        return new Set((folder.children || []).map(item => getFirstLetter(item.name)));
    }, [folder]);
    const visibleChildren = React.useMemo(() => {
        if (!isSearchableFolder) return folder.children;
        if (normalizedFolderSearch) {
            return folder.children.filter(item => normalizeText(item.name).includes(normalizedFolderSearch));
        }
        if (activeLetter) {
            return folder.children.filter(item => getFirstLetter(item.name) === activeLetter);
        }
        return [];
    }, [folder, isSearchableFolder, normalizedFolderSearch, activeLetter]);
    const folderTools = isSearchableFolder && React.createElement('div', { key: 'city-tools', className: 'city-tools fade-in' }, [
        React.createElement('div', { key: 'search', className: 'relative' }, [
            React.createElement('input', {
                key: 'input',
                type: 'text',
                className: 'search-input',
                placeholder: `Buscar cidade em ${folder.name}...`,
                value: folderSearch,
                onChange: (e) => { setFolderSearch(e.target.value); setActiveLetter(''); }
            }),
            folderSearch && React.createElement('button', { key: 'clear', className: 'search-button', onClick: () => setFolderSearch('') }, React.createElement(ClearSearchIcon))
        ]),
        React.createElement('div', { key: 'letters', className: 'letter-filter scrollbar-hide' }, alphabet.map(letter => React.createElement('button', {
            key: letter,
            type: 'button',
            className: `letter-btn ${activeLetter === letter ? 'active' : ''}`,
            disabled: !availableLetters.has(letter),
            onClick: () => { setActiveLetter(activeLetter === letter ? '' : letter); setFolderSearch(''); }
        }, letter)))
    ]);
    const content = visibleChildren.length > 0
        ? React.createElement('div', { key: 'grid', className: 'grid-apps' }, visibleChildren.map((item, idx) => React.createElement(AppCard, { key: `${item.name}-${idx}`, item, onFolderOpen: onOpenFolder })))
        : (isSearchableFolder ? null : React.createElement('div', { key: 'empty', className: 'city-empty' }, 'Nenhum item encontrado.'));

    return React.createElement('div', { className: 'tray-inner' }, [
        React.createElement('div', { key: 'nav', className: 'flex items-center gap-3 mb-6' }, [
            React.createElement('button', { onClick: onBack, className: 'back-emoji-btn', title: 'Retornar', 'aria-label': 'Retornar' }, React.createElement('img', { className: 'back-image-icon', src: 'assets/icons/icons8-undo-100.png', alt: '', 'aria-hidden': 'true' })),
            React.createElement('h2', { key: 'title', className: 'text-xl font-bold text-gray-700' }, folder.name)
        ]),
        folderTools,
        content
    ]);
};

const PhoneIcon = ({ size = 26, className = '' }) => React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': 'true'
}, React.createElement('path', { d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.61a2 2 0 0 1-.45 2.11L8.09 9.64a16 16 0 0 0 6.27 6.27l1.2-1.2a2 2 0 0 1 2.11-.45c.84.3 1.71.51 2.61.63A2 2 0 0 1 22 16.92Z' }));

const ContactsPage = ({ contactStore, onBack }) => {
    const store = ensureContactStore(contactStore);
    const [activeCluster, setActiveCluster] = React.useState('');
    const [activeArea, setActiveArea] = React.useState('');
    const [openNote, setOpenNote] = React.useState('');
    const sheetContacts = activeCluster ? (store.sheets?.[activeCluster] || []) : [];
    const sheetNote = activeCluster ? (store.sheetNotes?.[activeCluster] || '') : '';
    const noSubfilterClusters = ['BA', 'ES'];
    const defaultAllClusters = ['BA', 'ES', 'NE', 'NO', 'CO'];
    const usesSubfilters = activeCluster && !noSubfilterClusters.includes(activeCluster);
    const areaOptions = usesSubfilters ? Array.from(new Set(sheetContacts.map(contact => contact.area).filter(Boolean))) : [];
    const normalizedArea = normalizeText(activeArea);
    const shouldShowAll = !!activeCluster && !activeArea && defaultAllClusters.includes(activeCluster);
    const shouldShowMgEmpty = activeCluster === 'MG' && !activeArea;
    const baseVisibleContacts = shouldShowMgEmpty ? [] : sheetContacts.filter(contact => {
        if (shouldShowAll) return true;
        if (!activeArea) return activeCluster === 'RJ';
        if (isAlwaysVisibleContact(activeCluster, contact)) return true;
        if (normalizedArea && normalizeText(contact.area) === normalizedArea) return true;
        return false;
    });
    const visibleContacts = activeCluster === 'RJ' && activeArea
        ? baseVisibleContacts.filter(contact => normalizeText(contact.area) === normalizedArea || isAlwaysVisibleContact('RJ', contact))
        : baseVisibleContacts;
    const tableHeaders = activeCluster === 'RJ'
        ? ['Área', 'Topologia', 'Nome', 'Cargo', 'Telefone', 'Nível', '']
        : ['Área', 'Topologia', 'Nome', 'Cargo', 'Telefone', ''];
    const renderHeader = () => React.createElement('thead', { key: 'head' }, React.createElement('tr', null, tableHeaders.map(label => React.createElement('th', { key: label || 'info' },
        label === 'Telefone' && sheetNote ? React.createElement('span', { className: 'contact-header-note' }, [
            React.createElement('span', { key: 'label' }, label),
            React.createElement('button', { key: 'btn', type: 'button', className: 'contact-note-btn', onClick: () => setOpenNote(openNote === 'header-note' ? '' : 'header-note'), title: 'Ver observação', 'aria-label': 'Ver observação' }, 'i'),
            openNote === 'header-note' && React.createElement('span', { key: 'pop', className: 'contact-note-pop' }, sheetNote)
        ]) : label
    ))));
    const renderRows = (contacts, keyPrefix = activeCluster) => React.createElement('tbody', { key: `body-${keyPrefix}` }, contacts.map((contact, index) => {
        const noteText = [contact.observacoes, contact.note].filter(Boolean).join('\n');
        const noteKey = `${keyPrefix}-${index}`;
        return React.createElement('tr', { key: `${keyPrefix}-${contact.area}-${contact.topologia}-${contact.nome}-${index}` }, [
            React.createElement('td', { key: 'area' }, contact.area),
            React.createElement('td', { key: 'topologia' }, contact.topologia),
            React.createElement('td', { key: 'nome' }, contact.nome),
            React.createElement('td', { key: 'cargo' }, contact.cargo),
            React.createElement('td', { key: 'telefone' }, React.createElement('a', { className: 'whatsapp-link', href: `https://wa.me/55${contact.phoneDigits}`, target: '_blank', rel: 'noopener noreferrer' }, contact.telefone)),
            activeCluster === 'RJ' && React.createElement('td', { key: 'nivel' }, contact.nivel),
            React.createElement('td', { key: 'info', className: 'contact-info-cell' }, noteText ? React.createElement('span', { className: 'contact-note-wrap' }, [
                React.createElement('button', { key: 'btn', type: 'button', className: 'contact-note-btn', onClick: () => setOpenNote(openNote === noteKey ? '' : noteKey), title: 'Ver observação', 'aria-label': 'Ver observação' }, 'i'),
                openNote === noteKey && React.createElement('span', { key: 'pop', className: 'contact-note-pop' }, noteText)
            ]) : null)
        ]);
    }));
    const renderTable = (contacts, keyPrefix) => React.createElement('div', { key: `table-${keyPrefix}`, className: 'contacts-table-wrap' },
        React.createElement('table', { className: 'contacts-table' }, [renderHeader(), renderRows(contacts, keyPrefix)])
    );
    const rjAreaOptions = activeCluster === 'RJ' && activeArea ? [activeArea] : areaOptions;
    const rjGroups = activeCluster === 'RJ' ? rjAreaOptions.map(area => {
        const normalizedGroupArea = normalizeText(area);
        const contacts = visibleContacts.filter(contact => normalizeText(contact.area) === normalizedGroupArea || (activeArea && isAlwaysVisibleContact('RJ', contact)));
        return { area, contacts };
    }).filter(group => group.contacts.length > 0) : [];

    return React.createElement('div', { className: 'tray-inner contacts-page fade-in' }, [
        React.createElement('div', { key: 'nav', className: 'flex items-center gap-3' }, [
            React.createElement('button', { key: 'back', type: 'button', onClick: onBack, className: 'back-emoji-btn', title: 'Retornar', 'aria-label': 'Retornar' }, React.createElement('img', { className: 'back-image-icon', src: 'assets/icons/icons8-undo-100.png', alt: '', 'aria-hidden': 'true' })),
            React.createElement('h2', { key: 'title', className: 'text-xl text-gray-700' }, 'Contatos por cluster')
        ]),
        React.createElement('div', { key: 'clusters', className: 'cluster-tabs' }, CONTACT_CLUSTERS.map(cluster => React.createElement('button', {
            key: cluster,
            type: 'button',
            className: `cluster-btn ${activeCluster === cluster ? 'active' : ''}`,
            onClick: () => { setActiveCluster(cluster); setActiveArea(''); setOpenNote(''); }
        }, cluster))),
        !activeCluster ? React.createElement('div', { key: 'empty-logo', className: 'contact-hero' }, React.createElement('div', { className: 'contact-phone-logo' }, React.createElement(PhoneIcon, { size: 44 }))) : [
            usesSubfilters && React.createElement('div', { key: 'areas', className: 'area-filter-tabs' }, areaOptions.map(area => React.createElement('button', {
                key: area,
                type: 'button',
                className: `area-filter-btn ${activeArea === area ? 'active' : ''}`,
                onClick: () => { setActiveArea(activeArea === area ? '' : area); setOpenNote(''); }
            }, area))),
            activeCluster === 'RJ' ? (rjGroups.length === 0 ? React.createElement('div', { key: 'empty', className: 'city-empty' }, 'Nenhum contato encontrado para este filtro.') : React.createElement('div', { key: 'rj-groups', className: 'contact-accordion-list' }, rjGroups.map(group => React.createElement('details', { key: group.area, className: 'contact-accordion' }, [
                React.createElement('summary', { key: 'summary' }, group.area),
                renderTable(group.contacts, `RJ-${group.area}`)
            ])))) : (visibleContacts.length === 0 ? React.createElement('div', { key: 'empty', className: 'city-empty' }, activeArea ? 'Nenhum contato encontrado para este filtro.' : 'Selecione uma área.') : renderTable(visibleContacts, activeCluster))
        ]
    ]);
};
