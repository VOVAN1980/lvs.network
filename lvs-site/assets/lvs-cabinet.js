document.addEventListener("DOMContentLoaded", () => {
    // Мок-данные профиля. Потом просто заменишь на fetch('/api/profile/me')
    const profile = {
        username: "Volodymyr P.",
        status: "Individual · Founder · Node operator",
        avatar: "https://via.placeholder.com/160",
        tags: ["Human", "System architect", "LVS early participant"],
        tc: 0.87,
        tcLabel: "High trust",
        vu: 4200,
        vuLabel: "Top 5% contributor",
        stability: 93,
        activity: [
            {time: "10 min ago", text: "Node node1 stayed online for 24h without drift anomalies."},
            {time: "1 h ago", text: "Completed task 'Protocol review session' (+120 VU)."},
            {time: "Yesterday", text: "Received positive feedback from 'LVS Core Team'."}
        ],
        nodes: [
            {id: "node1", status: "online · Berlin gateway", tcImpact: "+0.12 TC last 24h"},
            {id: "node2", status: "online · mobile browser", tcImpact: "+0.04 TC last 24h"}
        ],
        skills: [
            "System design for distributed value networks",
            "Rust + WebSocket backends",
            "Product & tokenomics architecture"
        ],
        editable: {
            displayName: "Volodymyr",
            headline: "Founder & System architect at LVS",
            about: "Building LVS – an Autonomous Value Layer beyond traditional blockchains.",
            location: "Germany",
            visibility: "balanced"
        }
    };

    // Заполнение шапки
    const elAvatar = document.getElementById("cabinet-avatar");
    const elUsername = document.getElementById("cabinet-username");
    const elStatus = document.getElementById("cabinet-status");
    const elTags = document.getElementById("cabinet-tags");

    if (elAvatar) elAvatar.src = profile.avatar;
    if (elUsername) elUsername.textContent = profile.username;
    if (elStatus) elStatus.textContent = profile.status;
    if (elTags) {
        profile.tags.forEach(t => {
            const span = document.createElement("div");
            span.className = "lvs-tag";
            span.textContent = t;
            elTags.appendChild(span);
        });
    }

    // Статистика
    const tcEl = document.getElementById("cabinet-tc");
    const tcChip = document.getElementById("cabinet-tc-chip");
    const vuEl = document.getElementById("cabinet-vu");
    const vuChip = document.getElementById("cabinet-vu-chip");
    const stabEl = document.getElementById("cabinet-stability");

    if (tcEl) tcEl.textContent = profile.tc.toFixed(2);
    if (tcChip) tcChip.textContent = profile.tcLabel;
    if (vuEl) vuEl.textContent = profile.vu.toString();
    if (vuChip) vuChip.textContent = profile.vuLabel;
    if (stabEl) stabEl.textContent = profile.stability + "%";

    // Активность
    const actEl = document.getElementById("cabinet-activity");
    if (actEl) {
        profile.activity.forEach(a => {
            const div = document.createElement("div");
            div.className = "lvs-activity-item";
            div.innerHTML = `
                <div class="lvs-activity-time">${a.time}</div>
                <div class="lvs-activity-text">${a.text}</div>
            `;
            actEl.appendChild(div);
        });
    }

    // Ноды
    const nodesEl = document.getElementById("cabinet-nodes");
    if (nodesEl) {
        profile.nodes.forEach(n => {
            const div = document.createElement("div");
            div.className = "lvs-feed-item";
            div.innerHTML = `
                <div><strong>${n.id}</strong></div>
                <div class="lvs-feed-meta">${n.status} · ${n.tcImpact}</div>
            `;
            nodesEl.appendChild(div);
        });
    }

    // Skills
    const skillsEl = document.getElementById("cabinet-skills");
    if (skillsEl) {
        profile.skills.forEach(s => {
            const div = document.createElement("div");
            div.className = "lvs-feed-item";
            div.innerHTML = `<div>${s}</div>`;
            skillsEl.appendChild(div);
        });
    }

    // Editable data
    const inputDisplay = document.getElementById("input-display-name");
    const inputHeadline = document.getElementById("input-headline");
    const inputAbout = document.getElementById("input-about");
    const inputLocation = document.getElementById("input-location");
    const inputVisibility = document.getElementById("input-visibility");

    if (inputDisplay) inputDisplay.value = profile.editable.displayName;
    if (inputHeadline) inputHeadline.value = profile.editable.headline;
    if (inputAbout) inputAbout.value = profile.editable.about;
    if (inputLocation) inputLocation.value = profile.editable.location;
    if (inputVisibility) inputVisibility.value = profile.editable.visibility;

    // Переключение секций слева (пока просто визуально, секции уже размечены data-section-panel)
    const navItems = document.querySelectorAll(".lvs-nav-item[data-section]");
    const panels = document.querySelectorAll("[data-section-panel]");

    function showSection(section) {
        navItems.forEach(n => {
            n.classList.toggle("active", n.getAttribute("data-section") === section);
        });

        panels.forEach(p => {
            const sec = p.getAttribute("data-section-panel");
            // Показываем всегда activity/security/profile/nodes/skills, просто без жесткого hide,
            // чтобы не было "пустых" областей. Если захочешь строгий переключатель — тут display='none'.
            if (sec === section || section === "profile" || section === "activity") {
                p.style.display = "block";
            } else {
                // Сейчас не скрываем полностью, можно поменять стратегию позже.
            }
        });
    }

    navItems.forEach(n => {
        n.addEventListener("click", () => {
            const section = n.getAttribute("data-section");
            if (section) showSection(section);
        });
    });

    // Сохранение (пока просто лог в консоль, потом заменишь на fetch)
    const btnSave = document.getElementById("btn-save-profile");
    if (btnSave) {
        btnSave.addEventListener("click", () => {
            const payload = {
                displayName: inputDisplay ? inputDisplay.value : "",
                headline: inputHeadline ? inputHeadline.value : "",
                about: inputAbout ? inputAbout.value : "",
                location: inputLocation ? inputLocation.value : "",
                visibility: inputVisibility ? inputVisibility.value : "balanced"
            };
            console.log("PROFILE_SAVE_PAYLOAD", payload);
            // TODO: fetch('/api/profile/update', { method: 'POST', body: JSON.stringify(payload) ... })
            btnSave.textContent = "Saved";
            setTimeout(() => btnSave.textContent = "Save changes", 1200);
        });
    }

    // Стартовый секшен
    showSection("profile");
});
