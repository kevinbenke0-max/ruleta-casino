function getUsers() {
    let users = localStorage.getItem('casino_users');
    if (!users) {
        users = { "admin": { pass: "1234", chips: 5000 } };
        localStorage.setItem('casino_users', JSON.stringify(users));
        return users;
    }
    return JSON.parse(users);
}

function saveUsers(users) {
    localStorage.setItem('casino_users', JSON.stringify(users));
}

function renderTable() {
    const users = getUsers();
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let username in users) {
        let tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #333';
        tr.innerHTML = `
            <td style="padding: 10px; font-weight: bold;">${username}</td>
            <td style="padding: 10px; color: #aaa;">${users[username].pass}</td>
            <td style="padding: 10px; color: #ffd700; font-weight: bold;">🪙 ${users[username].chips.toLocaleString()}</td>
            <td style="padding: 10px;">
                <button onclick="quickAdd('${username}', 500)" class="btn-small" style="background: #27ae60;">+500</button>
                <button onclick="quickAdd('${username}', -500)" class="btn-small" style="background: #c0392b;">-500</button>
                <button onclick="deleteUser('${username}')" class="btn-small" style="background: #555;">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

const cashierForm = document.getElementById('cashier-form');
if (cashierForm) {
    cashierForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('new-user').value.trim();
        const pass = document.getElementById('new-pass').value.trim();
        const chips = parseInt(document.getElementById('new-chips').value);

        let users = getUsers();
        if (users[user]) {
            users[user].pass = pass;
            users[user].chips += chips;
        } else {
            users[user] = { pass: pass, chips: chips };
        }

        saveUsers(users);
        renderTable();
        cashierForm.reset();
        alert(`✅ Usuario '${user}' guardado con éxito.`);
    });
}

window.quickAdd = function(username, amount) {
    let users = getUsers();
    if (users[username]) {
        users[username].chips += amount;
        if (users[username].chips < 0) users[username].chips = 0;
        saveUsers(users);
        renderTable();
    }
};

window.deleteUser = function(username) {
    if (confirm(`¿Seguro que deseas eliminar al usuario ${username}?`)) {
        let users = getUsers();
        delete users[username];
        saveUsers(users);
        renderTable();
    }
};

renderTable();
