document.addEventListener("DOMContentLoaded", () => {
    // Мок публичного профиля. Потом можно подставлять через /api/profile/:id
    const publicProfile = {
        name: "Volodymyr",
        headline: "Founder & System architect at LVS",
        avatar: "https://via.placeholder.com/160",
        location: "Germany · LVS network",
        tags: ["Human", "Early LVS participant", "High-trust"],
        about: "Building LVS – a Living Value System that turns real actions into measurable value and trust.",
        tc: 0.87,
        tcLabel: "High trust (top 10%)",
        vu: 4200,
        vuLabel: "High contributor",
        stability: 93,
        activity: [
            {time: "Today", text: "Completed architecture review for LVS gateway nodes."},
            {time: "2 days ago", text: "Helped onboard a new company into LVS marketplace."}
        ],
        feedback: [
            {from: "LVS Core", text: "Consistent and reliable work on protocol design.", badge: "good"},
            {from: "Partner org", text: "Clear communication and strong execution.", badge: "good"}
        ]
    };

    const elTitle = document.getElementById("public-name");
    const elHeadline = document.getElementById("public-headline");
    const elAvatar = document.getElementById("public-avatar");
    const elDisplayName = document.getElementById("public-display-name");
    const elLocation = document.getElementById("public-location");
    const elTags = document.getElementById("public-tags");
    const elAbout = document.getElementById("public-about");
    const elActivity = document.getElementById("public-activity");
    const elFeedback = document.getElementById("public-feedback");

    const elTc = document.getElementById("public-tc");
    const elTcLabel = document.getElementById("public-tc-label");
    const elVu = document.getElementById("public-vu");
    const elVuLabel = document.getElementById("public-vu-label");
    const elStab = document.getElementById("public-stability");

    if (elTitle) elTitle.textContent = publicProfile.name;
    if (elHeadline) elHeadline.textContent = publicProfile.headline;
    if (elAvatar) elAvatar.src = publicProfile.avatar;
    if (elDisplayName) elDisplayName.textContent = publicProfile.name;
    if (elLocation) elLocation.textContent = publicProfile.location;

    if (elTags) {
        publicProfile.tags.forEach(t => {
            const span = document.createElement("div");
            span.className = "lvs-tag";
            span.textContent = t;
            elTags.appendChild(span);
        });
    }

    if (elAbout) elAbout.textContent = publicProfile.about;

    if (elTc) elTc.textContent = publicProfile.tc.toFixed(2);
    if (elTcLabel) elTcLabel.textContent = publicProfile.tcLabel;
    if (elVu) elVu.textContent = publicProfile.vu.toString();
    if (elVuLabel) elVuLabel.textContent = publicProfile.vuLabel;
    if (elStab) elStab.textContent = publicProfile.stability + "%";

    if (elActivity) {
        publicProfile.activity.forEach(a => {
            const div = document.createElement("div");
            div.className = "lvs-activity-item";
            div.innerHTML = `
                <div class="lvs-activity-time">${a.time}</div>
                <div class="lvs-activity-text">${a.text}</div>
            `;
            elActivity.appendChild(div);
        });
    }

    if (elFeedback) {
        publicProfile.feedback.forEach(f => {
            const div = document.createElement("div");
            div.className = "lvs-comment-item";
            const badgeClass = f.badge === "good" ? "lvs-badge-good" : "lvs-badge-warn";
            div.innerHTML = `
                <div class="lvs-comment-meta">
                    ${f.from} · <span class="${badgeClass}">${f.badge === "good" ? "positive" : "mixed"}</span>
                </div>
                <div class="lvs-comment-text">${f.text}</div>
            `;
            elFeedback.appendChild(div);
        });
    }
});
