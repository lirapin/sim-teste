const App = () => {
    const [user, setUser] = React.useState(() => {
        const saved = localStorage.getItem('sim_user');
        if (!saved) return null;
        const savedUser = JSON.parse(saved);
        return USERS.find(u => u.username === savedUser.username) || null;
    });
    const [activeCategory, setActiveCategory] = React.useState(bookmarkData[0]?.name || 'SIM');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [navigationStack, setNavigationStack] = React.useState([]);
    const [currentFolder, setCurrentFolder] = React.useState(null);
    const [showMessages, setShowMessages] = React.useState(false);
    const [messages, setMessagesState] = React.useState(() => { const saved = localStorage.getItem('sim_messages'); return saved ? JSON.parse(saved) : []; });
    const [seenReadIds, setSeenReadIdsState] = React.useState(() => { const saved = localStorage.getItem('sim_seen_read_ids'); return saved ? JSON.parse(saved) : []; });
    const [seenMessageIds, setSeenMessageIdsState] = React.useState(() => { const saved = localStorage.getItem('sim_seen_message_ids'); return saved ? JSON.parse(saved) : []; });
    const [contacts, setContactsState] = React.useState(() => { const saved = localStorage.getItem('sim_contacts'); return saved ? ensureContactStore(JSON.parse(saved)) : makeContactStore(); });
    const [activeToolPage, setActiveToolPage] = React.useState('');
    const [showTopMenu, setShowTopMenu] = React.useState(false);
    const contactUploadRef = React.useRef(null);
    const topMenuRef = React.useRef(null);

    const setMessages = (newMessages) => { setMessagesState(newMessages); localStorage.setItem('sim_messages', JSON.stringify(newMessages)); };
    const setSeenReadIds = (ids) => { setSeenReadIdsState(ids); localStorage.setItem('sim_seen_read_ids', JSON.stringify(ids)); };
    const setSeenMessageIds = (ids) => { setSeenMessageIdsState(ids); localStorage.setItem('sim_seen_message_ids', JSON.stringify(ids)); };
    const setContacts = (newContacts) => { const nextContacts = ensureContactStore(newContacts); setContactsState(nextContacts); localStorage.setItem('sim_contacts', JSON.stringify(nextContacts)); };

    const handleLogin = (userData) => { setUser(userData); localStorage.setItem('sim_user', JSON.stringify(userData)); };
    const handleLogout = () => { localStorage.removeItem('sim_user'); setUser(null); setCurrentFolder(null); setNavigationStack([]); setSearchTerm(''); };
    const openFolder = (folder) => { setActiveToolPage(''); setNavigationStack(prev => [...prev, currentFolder || bookmarkData.find(c => c.name === activeCategory)]); setCurrentFolder(folder); setSearchTerm(''); };
    const goBack = () => { const previous = navigationStack[navigationStack.length - 1]; setNavigationStack(prev => prev.slice(0, -1)); setCurrentFolder(previous); };
    const selectCategory = (categoryName) => { setActiveToolPage(''); setActiveCategory(categoryName); setCurrentFolder(null); setNavigationStack([]); setSearchTerm(''); };
    const goHome = () => { setActiveToolPage(''); setActiveCategory('SIM'); setCurrentFolder(null); setNavigationStack([]); setSearchTerm(''); };
    const openContactsPage = () => { setActiveToolPage('contacts'); setCurrentFolder(null); setNavigationStack([]); setSearchTerm(''); };
    React.useEffect(() => {
        if (!showTopMenu) return undefined;
        const handleOutsideClick = (event) => {
            if (topMenuRef.current && topMenuRef.current.contains(event.target)) return;
            setShowTopMenu(false);
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showTopMenu]);
    const parseCsv = (text) => {
        const rows = String(text || '').trim().split(/\r?\n/).map(line => line.split(/;|,/).map(value => value.trim()));
        const headers = rows.shift() || [];
        return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])));
    };
    const worksheetToRows = (sheet) => {
        if (!window.XLSX || !sheet?.['!ref']) return { rows: [], headerNotes: {} };
        const range = window.XLSX.utils.decode_range(sheet['!ref']);
        const headers = [];
        const headerNotes = {};
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = sheet[window.XLSX.utils.encode_cell({ r: range.s.r, c: col })];
            const header = String(cell?.v || '').trim();
            headers.push(header);
            if (cell?.c?.length) {
                const field = Object.keys(CONTACT_FIELDS).find(key => CONTACT_FIELDS[key].some(alias => normalizeText(header).includes(normalizeText(alias))));
                if (field) headerNotes[field] = cell.c.map(comment => comment.t).filter(Boolean).join('\n');
            }
        }
        const rows = [];
        for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex++) {
            const row = {};
            const notes = [];
            const fieldNotes = {};
            headers.forEach((header, offset) => {
                if (!header) return;
                const cell = sheet[window.XLSX.utils.encode_cell({ r: rowIndex, c: range.s.c + offset })];
                row[header] = cell?.v ?? '';
                if (cell?.c?.length) {
                    const note = cell.c.map(comment => comment.t).filter(Boolean).join('\n');
                    const field = Object.keys(CONTACT_FIELDS).find(key => CONTACT_FIELDS[key].some(alias => normalizeText(header).includes(normalizeText(alias))));
                    if (field) fieldNotes[field] = note;
                    notes.push(note);
                }
            });
            row.__note = notes.filter(Boolean).join('\n');
            row.__fieldNotes = fieldNotes;
            if (Object.values(row).some(value => String(value || '').trim())) rows.push(row);
        }
        return { rows, headerNotes };
    };
    const parseContactWorkbook = (workbook) => {
        const sheets = {};
        const references = {};
        const sheetNotes = {};
        workbook.SheetNames.slice(0, 7).forEach((sheetName, index) => {
            const cluster = CONTACT_CLUSTERS[index];
            const parsedSheet = worksheetToRows(workbook.Sheets[sheetName]);
            sheets[cluster] = parsedSheet.rows
                .map(row => normalizeContactRow(row, cluster))
                .filter(contact => contact.area && contact.nome && contact.telefone);
            const firstObservationNote = sheets[cluster].find(contact => contact.observacoes || contact.note);
            sheetNotes[cluster] = parsedSheet.headerNotes?.observacoes || firstObservationNote?.note || firstObservationNote?.observacoes || '';
        });
        workbook.SheetNames.slice(7, 14).forEach((sheetName, index) => {
            const fallbackCluster = CONTACT_CLUSTERS[index];
            const parsedSheet = worksheetToRows(workbook.Sheets[sheetName]);
            parsedSheet.rows.map(row => normalizeReferenceRow(row, fallbackCluster))
                .filter(ref => ref.area && ref.cidade)
                .forEach(ref => {
                    const clusterFromRow = String(ref.cluster || '').trim().toUpperCase();
                    const cluster = CONTACT_CLUSTERS.includes(clusterFromRow) ? clusterFromRow : fallbackCluster;
                    references[cluster] = references[cluster] || [];
                    references[cluster].push({ ...ref, sheet: cluster });
                });
        });
        CONTACT_CLUSTERS.forEach(cluster => {
            sheets[cluster] = sheets[cluster] || [];
            references[cluster] = references[cluster] || [];
            sheetNotes[cluster] = sheetNotes[cluster] || '';
        });
        return makeContactStore(sheets, references, sheetNotes);
    };
    const handleContactUpload = (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const data = loadEvent.target.result;
            let nextContacts = makeContactStore();
            if (window.XLSX && /\.(xlsx|xls)$/i.test(file.name)) {
                const workbook = window.XLSX.read(data, { type: 'array', cellComments: true });
                nextContacts = parseContactWorkbook(workbook);
            } else {
                const rows = parseCsv(data);
                nextContacts = makeContactStore({ BA: rows.map(row => normalizeContactRow(row, 'BA')).filter(contact => contact.area && contact.nome && contact.telefone) }, {});
            }
            setContacts(nextContacts);
            setActiveToolPage('contacts');
            setShowTopMenu(false);
            event.target.value = '';
        };
        if (window.XLSX && /\.(xlsx|xls)$/i.test(file.name)) reader.readAsArrayBuffer(file);
        else reader.readAsText(file, 'utf-8');
    };

    if (!user) return React.createElement(LoginPage, { onLogin: handleLogin });

    const isMessageVisibleToUser = (message, currentUser) => {
        if (currentUser.role === 'admin') return true;
        return message.to === 'todos' || message.to === currentUser.username || message.to === `group:${currentUser.group}`;
    };
    const unreadMessageCount = user.role === 'admin'
        ? 0
        : messages.filter(m => isMessageVisibleToUser(m, user) && !seenMessageIds.includes(m.id)).length;
    const readReceiptIds = messages.flatMap(m => (m.readBy || []).map(receipt => `${m.id}-${receipt.username}-${receipt.date}`));
    const unreadReadReceiptCount = user.role === 'admin'
        ? readReceiptIds.filter(id => !seenReadIds.includes(id)).length
        : 0;
    const messageNotificationCount = unreadMessageCount + unreadReadReceiptCount;
    const openMessageCenter = () => {
        setShowMessages(true);
        if (user.role === 'admin' && readReceiptIds.length > 0) {
            setSeenReadIds(Array.from(new Set([...seenReadIds, ...readReceiptIds])));
        } else if (user.role !== 'admin') {
            const visibleIds = messages.filter(m => isMessageVisibleToUser(m, user)).map(m => m.id);
            setSeenMessageIds(Array.from(new Set([...seenMessageIds, ...visibleIds])));
        }
    };

    const currentCategory = bookmarkData.find(c => c.name === activeCategory);
    const displayContent = () => {
        if (activeToolPage === 'contacts') return React.createElement(ContactsPage, { contactStore: contacts, onBack: goHome });
        if (searchTerm) return React.createElement(SearchResults, { searchTerm });
        if (currentFolder) return React.createElement(FolderView, { folder: currentFolder, onOpenFolder: openFolder, onBack: goBack });
        if (!currentCategory) return React.createElement('div', null, 'Categoria não encontrada');
        return React.createElement('div', { className: 'tray-inner category-layout' }, [
            React.createElement(CategoryTabs, { key: 'tabs', categories: bookmarkData, activeCategory, onSelect: selectCategory }),
            React.createElement('div', { key: 'grid', className: 'grid-apps category-grid' }, currentCategory.children.map((item, idx) => React.createElement(AppCard, { key: `${item.name}-${idx}`, item, onFolderOpen: openFolder })))
        ]);
    };

    const MessageCenter = ({ user, messages, setMessages, seenReadIds = [], onClose }) => {
        const [target, setTarget] = React.useState('todos');
        const [title, setTitle] = React.useState('');
        const [text, setText] = React.useState('');
        const [attachments, setAttachments] = React.useState([]);
        const [successMessage, setSuccessMessage] = React.useState('');
        const [checkedMessages, setCheckedMessages] = React.useState({});
        const [deleteMode, setDeleteMode] = React.useState(false);
        const [selectedMessageIds, setSelectedMessageIds] = React.useState([]);
        const getTargetLabel = (targetValue) => {
            if (targetValue === 'todos') return 'Todos';
            if (String(targetValue).startsWith('group:')) {
                const group = USER_GROUPS.find(item => item.id === targetValue.replace('group:', ''));
                return group ? `Grupo ${group.name}` : targetValue;
            }
            const targetUser = USERS.find(item => item.username === targetValue);
            return targetUser ? targetUser.displayName : targetValue;
        };
        const visibleMessages = user.role === 'admin'
            ? messages
            : messages.filter(m => m.to === 'todos' || m.to === user.username || m.to === `group:${user.group}`);
        const readNotifications = messages.flatMap(m => (m.readBy || [])
            .map(receipt => ({ message: m, receipt, id: `${m.id}-${receipt.username}-${receipt.date}` }))
            .filter(item => !seenReadIds.includes(item.id)));
        const sendMessage = () => {
            if (!title.trim() && !text.trim() && attachments.length === 0) return;
            const newMessage = { id: Date.now(), from: user.username, to: target, title: title.trim(), text: text.trim(), attachments, readBy: [], date: new Date().toLocaleString('pt-BR') };
            setMessages([newMessage, ...messages]);
            setTitle('');
            setText('');
            setAttachments([]);
            setSuccessMessage('Sua mensagem foi enviada com sucesso!');
        };
        const confirmRead = (message) => {
            if (user.role === 'admin') return;
            const alreadyRead = (message.readBy || []).some(receipt => receipt.username === user.username);
            if (alreadyRead || !checkedMessages[message.id]) return;
            const readReceipt = { username: user.username, displayName: user.displayName, date: new Date().toLocaleString('pt-BR') };
            setMessages(messages.map(m => m.id === message.id ? { ...m, readBy: [...(m.readBy || []), readReceipt] } : m));
            setCheckedMessages(prev => ({ ...prev, [message.id]: false }));
        };
        const toggleSelectedMessage = (id) => {
            setSelectedMessageIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
        };
        const deleteSelectedMessages = () => {
            if (selectedMessageIds.length === 0) return;
            setMessages(messages.filter(message => !selectedMessageIds.includes(message.id)));
            setSelectedMessageIds([]);
            setDeleteMode(false);
        };
        const exportConfirmationsPdf = () => {
            const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
            const rows = messages.flatMap(message => (message.readBy || []).map(receipt => ({
                name: receipt.displayName,
                date: String(receipt.date || '').split(',')[0] || '',
                time: String(receipt.date || '').split(',')[1]?.trim() || '',
                title: message.title || 'Sem título'
            })));
            const htmlRows = rows.map(row => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.time)}</td><td>${escapeHtml(row.title)}</td></tr>`).join('');
            const report = window.open('', '_blank');
            if (!report) return;
            report.document.write(`<html><head><title>Histórico de confirmações</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#111827}h1{color:#b91c1c}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e5e7eb;padding:10px;text-align:left;font-size:13px}th{background:#fff5f5;color:#991b1b}</style></head><body><h1>Histórico de confirmações</h1><table><thead><tr><th>Nome</th><th>Data</th><th>Hora</th><th>Título da mensagem</th></tr></thead><tbody>${htmlRows || '<tr><td colspan="4">Nenhuma confirmação registrada.</td></tr>'}</tbody></table></body></html>`);
            report.document.close();
            report.focus();
            report.print();
        };
        return React.createElement('div', { className: 'modal-overlay', onClick: (e) => { if (e.target === e.currentTarget) onClose(); } },
            React.createElement('div', { className: 'modal-card p-5' }, [
                React.createElement('div', { key: 'header', className: 'flex items-center justify-between mb-4' }, [
                    React.createElement('h2', { className: 'text-xl font-bold text-red-700' }, 'Central de Mensagens'),
                    React.createElement('div', { key: 'actions', className: 'modal-header-actions' }, [
                        user.role === 'admin' && React.createElement('button', { key: 'trash', onClick: () => { setDeleteMode(!deleteMode); setSelectedMessageIds([]); }, className: 'header-btn header-icon-btn', title: 'Selecionar mensagens para apagar', 'aria-label': 'Selecionar mensagens para apagar' }, React.createElement('svg', {
                            className: 'danger-line-icon',
                            width: 22,
                            height: 22,
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            strokeWidth: 2,
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            'aria-hidden': 'true'
                        }, [
                            React.createElement('path', { key: 'lid', d: 'M3 6h18' }),
                            React.createElement('path', { key: 'can', d: 'M8 6V4h8v2m-1 5v6M9 11v6M6 6l1 15h10l1-15' })
                        ])),
                        user.role === 'admin' && React.createElement('button', { key: 'back', onClick: onClose, className: 'header-btn header-icon-btn', title: 'Voltar', 'aria-label': 'Voltar' }, React.createElement('svg', {
                            className: 'danger-line-icon',
                            width: 22,
                            height: 22,
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            strokeWidth: 2,
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            'aria-hidden': 'true'
                        }, [
                            React.createElement('path', { key: 'curve', d: 'M9 14l-5-5 5-5' }),
                            React.createElement('path', { key: 'line', d: 'M4 9h10a6 6 0 0 1 6 6v1' })
                        ])),
                        React.createElement('button', { key: 'close', onClick: onClose, className: 'header-btn header-icon-btn', title: 'Sair', 'aria-label': 'Sair' }, React.createElement('svg', {
                            className: 'top-line-icon',
                            width: 22,
                            height: 22,
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
                        ]))
                    ])
                ]),
                user.role === 'admin' && React.createElement('div', { key: 'message-tabs', className: 'message-tabs message-tabs-single' }, [
                    React.createElement('button', { key: 'mensagens', type: 'button', className: 'message-tab active' }, 'Mensagens'),
                    React.createElement('button', { key: 'pdf', type: 'button', className: 'pdf-btn', onClick: exportConfirmationsPdf, title: 'Extrair confirmações em PDF' }, [
                        React.createElement('svg', {
                            key: 'icon',
                            width: 16,
                            height: 16,
                            viewBox: '0 0 24 24',
                            fill: 'none',
                            stroke: 'currentColor',
                            strokeWidth: 2,
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            'aria-hidden': 'true'
                        }, [
                            React.createElement('path', { key: 'arrow', d: 'M12 3v12' }),
                            React.createElement('path', { key: 'chevron', d: 'M7 10l5 5 5-5' }),
                            React.createElement('path', { key: 'base', d: 'M5 21h14' })
                        ]),
                        React.createElement('span', { key: 'label' }, 'PDF')
                    ])
                ]),
                user.role === 'admin' && React.createElement('div', { key: 'admin-area', className: 'border rounded-2xl p-4 mb-4 bg-gray-50' }, [
                    React.createElement('p', { className: 'text-sm font-semibold mb-2' }, 'Enviar mensagem'),
                    successMessage && React.createElement('p', { key: 'success', className: 'message-success' }, successMessage),
                    React.createElement('select', { className: 'search-input mb-2', value: target, onChange: (e) => setTarget(e.target.value) }, [
                        React.createElement('option', { key: 'todos', value: 'todos' }, 'Todos os usuários'),
                        ...USER_GROUPS.map(group => React.createElement('option', { key: `group-${group.id}`, value: `group:${group.id}` }, `Grupo ${group.name}`)),
                        ...USERS.map(u => React.createElement('option', { key: u.username, value: u.username }, u.displayName))
                    ]),
                    React.createElement('input', { key: 'title', type: 'text', className: 'search-input mb-2', placeholder: 'Título da mensagem', value: title, onChange: (e) => { setTitle(e.target.value); setSuccessMessage(''); } }),
                    React.createElement('div', { key: 'message-field', className: 'message-field mb-2' }, [
                        React.createElement('textarea', { key: 'textarea', className: 'search-input', rows: 3, placeholder: 'Digite sua mensagem...', value: text, onChange: (e) => { setText(e.target.value); setSuccessMessage(''); } }),
                        React.createElement('label', { key: 'attach-label', className: 'attachment-btn', title: 'Anexar arquivo', 'aria-label': 'Anexar arquivo' }, [
                            React.createElement('input', { key: 'attach-input', type: 'file', multiple: true, className: 'attachment-input', onChange: (e) => { setAttachments(Array.from(e.target.files || []).map(file => file.name)); setSuccessMessage(''); } }),
                            React.createElement('svg', {
                                key: 'attach-icon',
                                width: 17,
                                height: 17,
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: 'currentColor',
                                strokeWidth: 2,
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                'aria-hidden': 'true'
                            }, React.createElement('path', { d: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48' }))
                        ])
                    ]),
                    attachments.length > 0 && React.createElement('p', { key: 'attachments', className: 'attachment-list' }, `Anexo(s): ${attachments.join(', ')}`),
                    React.createElement('button', { onClick: sendMessage, className: 'bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-3 py-1.5 text-sm transition-all' }, 'Enviar mensagem')
                ]),
                user.role === 'admin' && deleteMode && React.createElement('div', { key: 'delete-bar', className: 'delete-bar' }, [
                    React.createElement('span', { key: 'text' }, `${selectedMessageIds.length} mensagem(ns) selecionada(s)`),
                    React.createElement('button', { key: 'delete', type: 'button', className: 'delete-confirm-btn', disabled: selectedMessageIds.length === 0, onClick: deleteSelectedMessages }, 'Apagar selecionadas')
                ]),
                React.createElement('div', { className: 'space-y-3 message-list overflow-y-auto' }, visibleMessages.length === 0 ?
                    React.createElement('p', { className: 'text-gray-500 text-center py-8' }, 'Nenhuma mensagem disponível') :
                    visibleMessages.map(m => {
                        const userReadReceipt = (m.readBy || []).find(receipt => receipt.username === user.username);
                        const messageDateParts = String(m.date || '').split(',');
                        const messageDate = messageDateParts[0]?.trim() || '';
                        const messageTime = messageDateParts[1]?.trim() || '';
                        if (user.role === 'admin') {
                            return React.createElement('details', { key: m.id, className: 'message-summary-card' }, [
                                React.createElement('summary', { key: 'summary' }, React.createElement('span', { className: 'message-summary-line' }, [
                                    React.createElement('span', { key: 'date' }, messageDate),
                                    React.createElement('span', { key: 'time' }, messageTime),
                                    React.createElement('span', { key: 'title', className: 'message-summary-title' }, m.title || 'Sem título')
                                ])),
                                React.createElement('div', { key: 'detail', className: 'message-detail-body' }, [
                                    user.role === 'admin' && deleteMode && React.createElement('input', { key: 'delete-check', type: 'checkbox', className: 'delete-check', checked: selectedMessageIds.includes(m.id), onChange: () => toggleSelectedMessage(m.id), 'aria-label': 'Selecionar mensagem para apagar' }),
                                    React.createElement('p', { key: 'meta', className: 'text-xs text-gray-500 mb-2' }, `De: ${m.from} • Para: ${getTargetLabel(m.to)}`),
                                    React.createElement('p', { key: 'text' }, m.text),
                                    m.attachments && m.attachments.length > 0 && React.createElement('p', { key: 'files', className: 'text-xs text-gray-500 mt-2' }, `Anexo(s): ${m.attachments.join(', ')}`),
                                    React.createElement('div', { key: 'receipts', className: 'message-receipts' }, (m.readBy || []).length === 0 ?
                                        React.createElement('p', null, 'Nenhuma confirmação de leitura ainda.') :
                                        (m.readBy || []).map(receipt => React.createElement('p', { key: `${receipt.username}-${receipt.date}` }, `Lida por: ${receipt.displayName} em ${receipt.date}`))
                                    )
                                ])
                            ]);
                        }
                        return React.createElement('div', { key: m.id, className: 'border rounded-2xl p-4' }, [
                            React.createElement('div', { key: 'meta', className: 'text-xs text-gray-500 mb-1' }, `${m.date} • De: ${m.from} • Para: ${getTargetLabel(m.to)}`),
                            m.title && React.createElement('h3', { key: 'title', className: 'text-sm font-bold text-gray-900 mb-1' }, m.title),
                            React.createElement('p', { key: 'text', className: 'text-sm text-gray-800' }, m.text),
                            m.attachments && m.attachments.length > 0 && React.createElement('p', { key: 'files', className: 'text-xs text-gray-500 mt-2' }, `Anexo(s): ${m.attachments.join(', ')}`),
                            userReadReceipt ?
                                React.createElement('p', { key: 'read-done', className: 'read-confirmed' }, `Recebida e lida em ${userReadReceipt.date}`) :
                                React.createElement('div', { key: 'read-actions', className: 'read-actions' }, [
                                    React.createElement('button', {
                                        key: 'check',
                                        type: 'button',
                                        className: `check-toggle ${checkedMessages[m.id] ? 'active' : ''}`,
                                        title: 'Li a mensagem',
                                        'aria-label': 'Li a mensagem',
                                        onClick: () => setCheckedMessages(prev => ({ ...prev, [m.id]: !prev[m.id] }))
                                    }, React.createElement('svg', {
                                        width: 17,
                                        height: 17,
                                        viewBox: '0 0 24 24',
                                        fill: 'none',
                                        stroke: 'currentColor',
                                        strokeWidth: 2.4,
                                        strokeLinecap: 'round',
                                        strokeLinejoin: 'round',
                                        'aria-hidden': 'true'
                                    }, React.createElement('path', { d: 'M20 6L9 17l-5-5' }))),
                                    React.createElement('button', {
                                        key: 'confirm',
                                        type: 'button',
                                        className: 'confirm-read-btn',
                                        disabled: !checkedMessages[m.id],
                                        onClick: () => confirmRead(m)
                                    }, 'Confirmar')
                                ])
                        ]);
                    })
                )
            ])
        );
    };

    return React.createElement('div', { className: 'min-h-screen', style: { background: '#d1d5db' } }, [
        React.createElement('input', { key: 'contact-upload', ref: contactUploadRef, type: 'file', className: 'hidden-file-input', accept: '.xlsx,.xls,.csv,.txt', onChange: handleContactUpload }),
        React.createElement('header', { key: 'header', className: 'sticky top-0 z-10 py-1' },
            React.createElement('div', { className: 'top-shell' },
                React.createElement('div', { className: 'flex flex-col md:flex-row md:items-center md:justify-between gap-4' }, [
                    React.createElement('button', { key: 'brand', type: 'button', onClick: goHome, className: 'brand-home-btn flex items-center gap-3', title: 'Voltar para SIM', 'aria-label': 'Voltar para SIM' }, [
                        React.createElement('div', { className: 'w-12 h-12 flex items-center justify-center' }, React.createElement('img', { className: 'portal-logo', src: 'assets/icons/icons8-owl-100.png', alt: '', 'aria-hidden': 'true' })),
                        React.createElement('div', { className: 'brand-copy' }, [
                            React.createElement('h1', { key: 'title', className: 'text-2xl font-bold text-red-700' }, 'SIM'),
                            React.createElement('p', { key: 'subtitle', className: 'text-xs font-semibold text-gray-600' }, 'Sistema Integrado Madrugada'),
                            React.createElement('p', { key: 'welcome', className: 'text-xs text-gray-500' }, `Bem vinda, ${user.displayName}`)
                        ])
                    ]),
                    React.createElement('div', { key: 'actions', className: 'flex items-center gap-3 flex-1 md:max-w-xl' }, [
                        React.createElement('div', { key: 'search', className: 'relative flex-1' }, [
                            React.createElement('input', { type: 'text', className: 'search-input', placeholder: 'Buscar ferramentas...', value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) }),
                            searchTerm && React.createElement('button', { className: 'search-button', onClick: () => setSearchTerm('') }, React.createElement(ClearSearchIcon))
                        ]),
                        React.createElement('button', { key: 'phone', onClick: openContactsPage, className: 'header-btn header-icon-btn', title: 'Contatos', 'aria-label': 'Contatos' }, React.createElement(PhoneIcon, { size: 22, className: 'top-line-icon' })),
                        React.createElement('div', { key: 'menu-wrap', ref: topMenuRef, className: 'top-menu-wrap' }, [
                            React.createElement('button', { key: 'menu', onClick: () => setShowTopMenu(!showTopMenu), className: 'header-btn header-icon-btn', title: 'Menu', 'aria-label': 'Menu' }, React.createElement('svg', {
                                className: 'top-line-icon',
                                width: 22,
                                height: 22,
                                viewBox: '0 0 24 24',
                                fill: 'none',
                                stroke: 'currentColor',
                                strokeWidth: 2.2,
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                'aria-hidden': 'true'
                            }, [
                                React.createElement('path', { key: 'top', d: 'M5 7h14' }),
                                React.createElement('path', { key: 'middle', d: 'M5 12h14' }),
                                React.createElement('path', { key: 'bottom', d: 'M5 17h14' })
                            ])),
                                showTopMenu && user.role === 'admin' && React.createElement('div', { key: 'popover', className: 'top-menu-popover' },
                                    React.createElement('button', { type: 'button', className: 'top-menu-item', onClick: () => contactUploadRef.current && contactUploadRef.current.click() }, [
                                        React.createElement('span', { key: 'text' }, 'Planilha de contatos'),
                                        React.createElement('svg', {
                                            key: 'upload',
                                            className: 'menu-upload-icon',
                                            viewBox: '0 0 24 24',
                                            fill: 'none',
                                            stroke: 'currentColor',
                                            strokeLinecap: 'round',
                                            strokeLinejoin: 'round',
                                            'aria-hidden': 'true'
                                        }, [
                                            React.createElement('path', { key: 'arrow', d: 'M12 16V4' }),
                                            React.createElement('path', { key: 'head', d: 'M7 9l5-5 5 5' }),
                                            React.createElement('path', { key: 'tray', d: 'M5 20h14' })
                                        ])
                                    ])
                                )
                            ]),
                            React.createElement('button', { key: 'messages', onClick: openMessageCenter, className: 'header-btn header-icon-btn', title: 'Minhas mensagens', 'aria-label': 'Minhas mensagens' }, [
                                React.createElement('img', { key: 'icon', className: 'top-image-icon', src: 'assets/icons/message-envelope.svg', alt: '', 'aria-hidden': 'true' }),
                                messageNotificationCount > 0 && React.createElement('span', { key: 'badge', className: 'notification-badge', 'aria-hidden': 'true' })
                            ]),
                        React.createElement('button', { key: 'logout', onClick: handleLogout, className: 'header-btn header-icon-btn', title: 'Sair', 'aria-label': 'Sair' }, React.createElement('svg', {
                            className: 'top-line-icon',
                            width: 22,
                            height: 22,
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
                        ]))
                    ])
                ])
            )
        ),
        React.createElement('main', { key: 'main', className: 'main-shell' },
            [
                React.createElement('section', { key: 'tray', className: 'content-tray fade-in' }, displayContent()),
                React.createElement('p', { key: 'signature', className: 'signature' }, 'Desenvolvido por N5923221')
            ]
        ),
        showMessages && React.createElement(MessageCenter, { key: 'messages', user, messages, setMessages, seenReadIds, onClose: () => setShowMessages(false) })
    ]);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
