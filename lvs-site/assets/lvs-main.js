document.addEventListener("DOMContentLoaded", () => {
    // Моки – потом заменишь на fetch('/api/...').
    const stats = {
        users: 1284,
        tasks: 47,
        companies: 32
    };

    const events = [
        {
            time: "Just now",
            text: "New participant joined the LVS testnet from Berlin.",
        },
        {
            time: "6 min ago",
            text: "Task 'Landing page design' completed with +23 VU for the performer.",
        },
        {
            time: "19 min ago",
            text: "Company 'Nova Services' raised TC from 0.78 → 0.82.",
        },
        {
            time: "1 h ago",
            text: "Browser node swarm reached 41 live connections.",
        }
    ];

    const marketplace = [
        {
            title: "Rust backend for LVS micro-service",
            meta: "+180 VU · remote · advanced"
        },
        {
            title: "UI/UX polish for marketplace dashboard",
            meta: "+95 VU · design · 1 week"
        },
        {
            title: "Onboarding for small business into LVS",
            meta: "+60 VU · consulting · flexible"
        }
    ];

    const elUsers = document.getElementById("stat-users");
    const elTasks = document.getElementById("stat-tasks");
    const elCompanies = document.getElementById("stat-companies");

    if (elUsers) elUsers.textContent = `${stats.users} active participants`;
    if (elTasks) elTasks.textContent = `${stats.tasks} open tasks`;
    if (elCompanies) elCompanies.textContent = `${stats.companies} companies online`;

    const feedEvents = document.getElementById("feed-events");
    if (feedEvents) {
        events.forEach(e => {
            const div = document.createElement("div");
            div.className = "lvs-feed-item";
            div.innerHTML = `
                <div class="lvs-feed-meta">${e.time}</div>
                <div>${e.text}</div>
            `;
            feedEvents.appendChild(div);
        });
    }

    const feedMarket = document.getElementById("feed-marketplace");
    if (feedMarket) {
        marketplace.forEach(m => {
            const div = document.createElement("div");
            div.className = "lvs-feed-item";
            div.innerHTML = `
                <div>${m.title}</div>
                <div class="lvs-feed-meta">${m.meta}</div>
            `;
            feedMarket.appendChild(div);
        });
    }
});
