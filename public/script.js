function toggleMenu() { document.getElementById('nav-menu').classList.toggle('active'); }

    function toggleNightLab() {
    const body = document.body;
    const toggleBtn = document.getElementById('night-toggle');
    
    // Toggle the dark-mode class
    body.classList.toggle('dark-mode');
    
    // Check if it's currently dark mode and update UI + LocalStorage
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('arc_theme', 'dark');
        toggleBtn.innerHTML = '☀️ Day Lab';
        toggleBtn.style.color = 'var(--gold)'; // Highlight the button
    } else {
        localStorage.setItem('arc_theme', 'light');
        toggleBtn.innerHTML = '🌙 Night Lab';
        toggleBtn.style.color = 'white'; // Reset button color
    }
}

    function openModal(id) { document.getElementById(id).style.display = 'flex'; document.body.classList.add('modal-open'); }
    function closeModal(id) { 
        document.getElementById(id).style.display = 'none'; 
        document.body.classList.remove('modal-open'); 
        if(id === 'pdf-modal') {
            toggleWatermark(false); 
            document.getElementById('pdf-frame').src = '';
            localStorage.removeItem('arc_open_pdf'); // 🧹 CLEAR PDF STATE
        }
    }


    // --- 🎇 Chemical Explosion Logic ---
function triggerChemicalExplosion() {
    let container = document.getElementById('chem-explosion-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'chem-explosion-container';
        document.body.appendChild(container);
    }
    container.style.display = 'block';
    container.innerHTML = ''; // Clear old particles

    // The emojis that will explode
    const particles = ['⚗️', '🧪', '⚛️', '✨', '🫧', '🟢', '🟡', '🔥'];
    const numParticles = 70; // How many particles to shoot

    for (let i = 0; i < numParticles; i++) {
        const p = document.createElement('div');
        p.className = 'chem-particle';
        p.innerText = particles[Math.floor(Math.random() * particles.length)];
        
        // Calculate random explosive trajectory
        const tx = (Math.random() - 0.5) * 1000 + 'px'; // Spread wide left/right
        const ty = -(Math.random() * 800 + 200) + 'px'; // Shoot high up
        const rot = (Math.random() * 720 - 360) + 'deg'; // Spin randomly
        const scale = (Math.random() * 1.5 + 0.8); // Random sizes
        const duration = (Math.random() * 1.5 + 2) + 's'; // 2 to 3.5 seconds
        const delay = (Math.random() * 0.2) + 's'; // Slight delay for fountain effect
        
        // Inject the random math directly into the CSS variables
        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);
        p.style.setProperty('--rot', rot);
        p.style.setProperty('--s', scale);
        p.style.setProperty('--dur', duration);
        p.style.setProperty('--delay', delay);
        
        container.appendChild(p);
    }

    // Hide and clean up the container after the animation finishes
    setTimeout(() => {
        container.style.display = 'none';
        container.innerHTML = '';
    }, 4000);
}

    window.onload = function() {
    fetchGlobalStoreData(); // Add this line
        // --- ADD THIS INSIDE window.onload ---
const savedTheme = localStorage.getItem('arc_theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    const toggleBtn = document.getElementById('night-toggle');
    if(toggleBtn) {
        toggleBtn.innerHTML = '☀️ Day Lab';
        toggleBtn.style.color = 'var(--gold)';
    }
}
// -------------------------------------

        loadSiteLogo(); // FEATURE: FETCH DYNAMIC LOGO ON STARTUP
        loadMaterials(); loadAnnouncements(); loadBlogs(); loadStories(); 
        loadPOTD(); loadVideosList(); loadRefToolsStudent();
        
        const lastSection = localStorage.getItem('arc_last_section') || 'home';
        
        if(user) {
            document.getElementById('nav-login').style.display = 'none';
            document.getElementById('nav-logout').style.display = 'block';
            document.getElementById('nav-doubts').style.display = 'block'; 
            document.getElementById('nav-store').style.display = 'block';
            checkDailyLogin(); // This handles rendering the coins and giving the daily bonus!
            initSecurityShield(); // Start the guard
            if(user.role === 'admin') document.getElementById('nav-admin').style.display = 'block';
        }

        const session = JSON.parse(localStorage.getItem('arc_test_session'));
        if (session && user) {
            const now = Date.now();
            currentTest = session.test;
            answers = session.answers;
            timeTaken = session.timeTaken;
            if (session.endTime > now) {
                qIndex = session.qIndex;
                show('exam'); renderQ();
                toggleWatermark(true);
                const pBtns = document.getElementById('palette').children;
                if(pBtns.length > 0) {
                     answers.forEach((ans, i) => { if(ans !== null && pBtns[i]) pBtns[i].classList.add('done'); });
                }
                startTimer(session.endTime);
                return; 
            } else {
                alert("Time expired while you were away. Submitting test now...");
                submitTest(true); 
                return;
            }
        }
        // 💾 RESTORE PDF IF REFRESHED
        const savedPdf = JSON.parse(localStorage.getItem('arc_open_pdf'));
        if (savedPdf && user) {
            setTimeout(() => openPdfViewer(savedPdf.title, savedPdf.link), 500); 
        }
        if(user) show(lastSection); else show('home');
    };

    let user = JSON.parse(localStorage.getItem('arc_user'));
    let currentTest = null, answers = [], timeTaken = [], timer = null, qIndex = 0, draftQ = [], allBlogs = [], allMats = [];
    let offlineDraft = [], loginMode = 'student', tempImg = "", tempSolImg = "", resultChartInstance = null;
    let editingBlogId = null, editingTestId = null, editingMaterialId = null, editingOfflineId = null;
    let editQIndex = -1;
    let intervalSec = 0; 
    let testEndTime = null; 
    let topicRadarInstance = null; 

    // FEATURE: DYNAMIC LOGO LOAD & SAVE
    async function loadSiteLogo() {
        try {
            const res = await fetch('/api/logo');
            const data = await res.json();
            if(data.logo) {
                document.getElementById('dynamic-favicon').href = data.logo;
                document.getElementById('nav-logo').src = data.logo;
                document.getElementById('nav-logo').style.display = 'block';
            }
        } catch(e) {}
    }

    async function saveSiteLogo() {
        if(!tempImg) return alert("Please select an image first!");
        await fetch('/api/admin/logo', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ logoBase64: tempImg }) });
        alert("Logo Updated Successfully!");
        tempImg = "";
        loadSiteLogo(); // apply instantly
    }

    function saveSession(endTime) { 
        if(!currentTest) return; 
        const finalEndTime = endTime || testEndTime || JSON.parse(localStorage.getItem('arc_test_session'))?.endTime;
        localStorage.setItem('arc_test_session', JSON.stringify({ test: currentTest, answers: answers, timeTaken: timeTaken, qIndex: qIndex, endTime: finalEndTime })); 
    }
    function clearSession() { localStorage.removeItem('arc_test_session'); }

    let homeDoubtFileBase64 = "";

    function encodeHomeDoubtFile(input) {
        if (input.files && input.files[0]) {
            if(input.files[0].size > 5 * 1024 * 1024) {
                input.value = "";
                return alert("File is too large! Please keep it under 5MB.");
            }
            document.getElementById('home-d-fileName').innerText = "✅ Attached: " + input.files[0].name;
            const reader = new FileReader();
            reader.onload = function(e) { homeDoubtFileBase64 = e.target.result; };
            reader.readAsDataURL(input.files[0]);
        }
    }

    async function submitHomeDoubt() {
        if(!user) return alert("Please login first to ask a question.");
        const text = document.getElementById('home-d-text').value;
        if(!text && !homeDoubtFileBase64) return alert("Please type a question or attach a file.");
        await fetch('/api/doubt', { 
            method: 'POST', headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ studentEmail: user.email, studentName: user.name, text: text, image: homeDoubtFileBase64 }) 
        });
        alert("Doubt sent successfully! The teacher will review it soon.");
        document.getElementById('home-d-text').value = ""; document.getElementById('home-d-file').value = ""; document.getElementById('home-d-fileName').innerText = ""; homeDoubtFileBase64 = ""; loadStudentDoubts();
    }

    function show(id) {
        if((id==='tests' || id==='live' || id==='results' || id==='doubts') && !user) return show('login');
        if(id === 'schedule') loadSchedule();
        if(id === 'doubts') loadStudentDoubts(); 
        if(id==='admin' && (!user || user.role !== 'admin')) return alert("Access Denied");
        localStorage.setItem('arc_last_section', id);
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        window.scrollTo(0,0);
        document.getElementById('nav-menu').classList.remove('active');
        if(id==='tests') loadTests(false); 
        if(id==='live') loadTests(true); 
        if(id==='results') loadResults('practice'); 
        if(id==='store') { fetchGlobalStoreData(); loadMyDiscounts(); }
    }

    
    // ==========================================
    // 🎮 ARC MULTI-GAME COMPONENT (ROTARY DIAL)
    // ==========================================
   // ==========================================
    // 🎮 ARC MULTI-GAME COMPONENT (NEW EDUTAINMENT)
    // ==========================================
    window.arcGames = { instances: {} };

    function getEmptyStateGame(message) {
        const id = Math.random().toString(36).substr(2, 9);
        
        // The 4 New Premium Chemistry Edutainment Features
        const gamesList = [
            { id: 'wheel', name: 'Spin to Win', icon: '🎡' }, // Replaced 3D Sandbox!
            { id: 'reaction', name: 'Rxn Match', icon: '🧩' },
            { id: 'periodic', name: 'Exceptions', icon: '📊' },
            { id: 'guess', name: 'ChemWordle', icon: '❓' }
        ];

        let dialHTML = `<div class="dial-container" id="dial-${id}"><div class="dial-center">⚛️</div>`;
        const totalGames = gamesList.length;
        
        gamesList.forEach((g, i) => {
            // Perfect math to place 4 items at top, right, bottom, and left
            const angle = (i * (360 / totalGames)) - 90;
            const radius = 145; 
            
            dialHTML += `
                <div class="dial-btn" id="btn-${id}-${g.id}" onclick="ArcGameEngine.load('${id}', '${g.id}', this)" 
                     style="left: calc(50% + ${radius * Math.cos(angle * Math.PI / 180)}px); top: calc(50% + ${radius * Math.sin(angle * Math.PI / 180)}px);">
                    <span class="dial-btn-icon">${g.icon}</span><span>${g.name}</span>
                </div>`;
        });
        dialHTML += `</div>`;

        return `
        <div class="empty-game-wrapper" id="game-wrap-${id}">
            <h3 style="color: var(--primary); margin-top:0; font-size:1.5rem;">${message}</h3>
            <p style="color: #666; margin-bottom: 5px; font-weight: bold;">Teacher hasn't added data here yet. Explore the tools below!</p>
            ${dialHTML}
            <div class="empty-game-board" id="game-bg-${id}">
                <p style="color:#cbd5e1; font-size:1.2rem; padding: 20px;">Use the dial above to select a learning tool! 🔬</p>
            </div>
        </div>`;
    }

    const ArcGameEngine = {
        clearState: function(id) {
            if(window.arcGames.instances[id]) {
                clearInterval(window.arcGames.instances[id].interval);
                clearTimeout(window.arcGames.instances[id].timeout);
            }
            window.arcGames.instances[id] = {};
            const bg = document.getElementById(`game-bg-${id}`);
            if(bg) bg.innerHTML = '';
        },
        load: function(id, type, btnElem) {
            const dial = document.getElementById(`dial-${id}`);
            if(dial) {
                const btns = dial.getElementsByClassName('dial-btn');
                for(let b of btns) b.classList.remove('active');
                if(btnElem) btnElem.classList.add('active');
            }
            this.clearState(id);
            if(this[type] && this[type].init) this[type].init(id);
        },

        // --- 1. FORTUNE WHEEL (Spin to Win) ---
        wheel: {
            prizes: [],
            isSpinning: false,
            init: async function(id) {
                // Fetch dynamic prizes set by Teacher
                const res = await fetch('/api/wheel');
                this.prizes = await res.json();
                
                let conicColors = [];
                let sliceAngle = 360 / this.prizes.length;
                
                this.prizes.forEach((p, i) => {
                    let start = i * sliceAngle;
                    let end = start + sliceAngle;
                    conicColors.push(`${p.color} ${start}deg ${end}deg`);
                });

                document.getElementById(`game-bg-${id}`).innerHTML = `
                    <style>
                        .wheel-box { position: relative; width: 220px; height: 220px; margin: 0 auto 20px auto; }
                        .wheel { width: 100%; height: 100%; border-radius: 50%; border: 6px solid var(--gold); box-shadow: 0 0 20px rgba(0,0,0,0.5); transition: transform 4s cubic-bezier(0.175, 0.885, 0.32, 1.275); background: conic-gradient(${conicColors.join(', ')}); }
                        .wheel-pointer { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 30px solid white; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.5)); z-index: 10; }
                        .wheel-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: white; border-radius: 50%; border: 4px solid var(--primary); z-index: 5; }
                    </style>
                    <h3 style="color:var(--gold); margin-top:0;">ARC Fortune Wheel 🎡</h3>
                    <p style="color:#cbd5e1; font-size:0.85rem; margin-top:-10px; margin-bottom:15px;">Cost: <b>10 Coins</b> per spin!</p>
                    
                    <div class="wheel-box">
                        <div class="wheel-pointer"></div>
                        <div class="wheel" id="spin-wheel-el-${id}"></div>
                        <div class="wheel-center"></div>
                    </div>
                    
                    <button class="btn btn-gold" id="spin-btn-${id}" style="width: 200px; font-size: 1.1rem; box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);" onclick="ArcGameEngine.wheel.spin('${id}')">SPIN NOW</button>
                    <div id="wheel-msg-${id}" style="margin-top: 15px; font-weight: bold; min-height: 25px;"></div>
                `;
            },
            spin: async function(id) {
                if(!user) return alert("Please log in to spin the wheel!");
                if(user.coins < 10) return document.getElementById(`wheel-msg-${id}`).innerHTML = `<span style="color:var(--red);">Not enough coins! You need 10 🪙</span>`;
                if(this.isSpinning) return;
                
                this.isSpinning = true;
                const msgEl = document.getElementById(`wheel-msg-${id}`);
                const wheelEl = document.getElementById(`spin-wheel-el-${id}`);
                const btn = document.getElementById(`spin-btn-${id}`);
                
                msgEl.innerHTML = `<span style="color:white;">Spinning... Good luck!</span>`;
                btn.style.opacity = "0.5";

                // Generate random spin angle
                const randomDegree = Math.floor(Math.random() * 360);
                const totalSpins = 3600; // 10 full rotations
                const finalAngle = totalSpins + randomDegree;
                
                // Apply rotation
                wheelEl.style.transform = `rotate(${finalAngle}deg)`;
                
                // Calculate which slice won based on top pointer (270 degrees offset)
                const actualDegree = (360 - (randomDegree % 360)) % 360;
                const sliceAngle = 360 / this.prizes.length;
                const winningIndex = Math.floor(actualDegree / sliceAngle);
                const prize = this.prizes[winningIndex];

                // Wait for animation to finish
                setTimeout(async () => {
                    // Send to Server to deduct coins and award prize securely
                    const res = await fetch('/api/student/spin', {
                        method: 'POST', headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ email: user.email, cost: 10, prizeType: prize.type, prizeValue: prize.value, prizeLabel: prize.label })
                    });
                    const data = await res.json();
                    
                    if(data.success) {
                        // Update UI Wallet visually
                        user.coins = data.coins;
                        localStorage.setItem('arc_user', JSON.stringify(user));
                        document.getElementById('wallet-coins').innerText = user.coins;
                        if(document.getElementById('store-big-coins')) document.getElementById('store-big-coins').innerText = user.coins;
                        
                        // Handle Visual Win State
                        if (prize.type === 'coins' && prize.value > 0) {
                            msgEl.innerHTML = `<span style="color:var(--green); font-size:1.2rem;">🎉 YOU WON ${prize.label}!</span>`;
                            if(typeof triggerChemicalExplosion === "function") triggerChemicalExplosion();
                        } else if (prize.type === 'discount') {
                            msgEl.innerHTML = `<span style="color:var(--gold); font-size:1.2rem;">🎫 YOU WON A ${prize.label}!</span><br><span style="font-size:0.8rem; color:#cbd5e1;">(Take a screenshot and show Teacher)</span>`;
                            if(typeof triggerChemicalExplosion === "function") triggerChemicalExplosion();
                        } else {
                            msgEl.innerHTML = `<span style="color:var(--red); font-size:1.1rem;">${prize.label}</span>`;
                        }
                    } else {
                        msgEl.innerHTML = `<span style="color:var(--red);">${data.message}</span>`;
                    }
                    
                    this.isSpinning = false;
                    btn.style.opacity = "1";
                    
                    // Reset wheel to static position without animation for next spin
                    setTimeout(() => {
                        wheelEl.style.transition = "none";
                        wheelEl.style.transform = `rotate(${randomDegree}deg)`;
                        setTimeout(() => { wheelEl.style.transition = "transform 4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"; }, 50);
                    }, 500);
                    
                }, 4000); // 4 seconds matches CSS transition
            }
        },

        // --- 2. ORGANIC REACTION MATCH-UP ---
        reaction: {
            data: [
                { react: "Primary Alcohol", prod: "Aldehyde", reagent: "PCC" },
                { react: "Benzene", prod: "Nitrobenzene", reagent: "Conc. HNO₃ + Conc. H₂SO₄" },
                { react: "Alkyne", prod: "Cis-Alkene", reagent: "Lindlar's Catalyst" },
                { react: "Amide", prod: "Primary Amine", reagent: "Br₂ + KOH (Hoffmann)" },
                { react: "Ketone", prod: "Alkane", reagent: "Zn(Hg) / HCl (Clemmensen)" },
                { react: "Phenol", prod: "Salicylaldehyde", reagent: "CHCl₃ + aq. NaOH (Reimer-Tiemann)" },
                { react: "Benzene", prod: "toluene", reagent: "CH3Cl + alhy. AlCl3"},
            ],
            init: function(id) {
                window.arcGames.instances[id] = { score: 0, qIndex: 0 };
                // Shuffle the questions
                this.data.sort(() => 0.5 - Math.random());
                this.next(id);
            },
            next: function(id) {
                const state = window.arcGames.instances[id];
                if(state.qIndex >= this.data.length) {
                    document.getElementById(`game-bg-${id}`).innerHTML = `<h2 style="color:var(--gold);">Reaction Master! 🏆</h2><p>You completed all conversions flawlessly.</p><button class="btn btn-gold" onclick="ArcGameEngine.reaction.init('${id}')">Play Again</button>`;
                    return;
                }
                const q = this.data[state.qIndex];
                
                // Get 3 random wrong reagents + the correct one
                let options = this.data.map(d => d.reagent).filter(r => r !== q.reagent);
                options.sort(() => 0.5 - Math.random());
                options = options.slice(0, 3);
                options.push(q.reagent);
                options.sort(() => 0.5 - Math.random()); // shuffle final 4

                document.getElementById(`game-bg-${id}`).innerHTML = `
                    <h3 style="color:white; margin-top:0;">Complete the Conversion</h3>
                    <div style="background:#1e293b; padding:15px; border-radius:8px; border:2px dashed #475569; margin-bottom:20px; font-size:1.1rem; font-weight:bold; color:var(--gold);">
                        ${q.react} &nbsp; ➡ &nbsp; ${q.prod}
                    </div>
                    <p style="color:#cbd5e1; font-size:0.9rem; margin-top:-10px; margin-bottom: 10px;">Select the correct reagent:</p>
                    <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
                        ${options.map(opt => `<button class="btn" style="background:#334155; color:white; border:1px solid #475569; padding: 10px; font-size:0.9rem;" onclick="ArcGameEngine.reaction.check('${id}', '${opt}', '${q.reagent}')">${opt}</button>`).join('')}
                    </div>
                `;
            },
            check: function(id, selected, correct) {
                const state = window.arcGames.instances[id];
                if(selected === correct) {
                    state.score++;
                    state.qIndex++;
                    this.next(id);
                } else {
                    document.getElementById(`game-bg-${id}`).innerHTML += `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10;"><h2 style="color:var(--red);">Wrong Reagent 💥</h2><p style="color: white; padding: 0 20px; text-align:center;">The correct reagent to convert to the target product is:<br><br><b style="color:var(--gold); font-size:1.2rem;">${correct}</b></p><button class="btn btn-gold" style="margin-top: 15px;" onclick="ArcGameEngine.reaction.next('${id}')">Continue</button></div>`;
                    state.qIndex++;
                }
            }
        },

        // --- 3. PERIODIC TABLE EXCEPTIONS ---
        periodic: {
            data: [
                { el: 'Cr', name: 'Chromium', fact: 'Anomalous Electron Configuration: [Ar] 4s¹ 3d⁵ (due to half-filled stability).' },
                { el: 'Cu', name: 'Copper', fact: 'Anomalous Electron Configuration: [Ar] 4s¹ 3d¹⁰ (due to fully-filled stability).' },
                { el: 'Pd', name: 'Palladium', fact: 'Has NO s-electrons in its valence shell! It is [Kr] 4d¹⁰ 5s⁰.' },
                { el: 'N', name: 'Nitrogen', fact: 'Cannot expand its octet to form NCl₅ because it lacks d-orbitals.' },
                { el: 'F', name: 'Fluorine', fact: 'Highest electronegativity, but lower electron gain enthalpy than Chlorine (due to small size and electron repulsion).' },
                { el: 'B', name: 'Boron', fact: 'Forms electron-deficient compounds like Diborane (B₂H₆) which contains 3-center-2-electron "banana bonds".' },
                { el: 'Al', name: 'Aluminum', fact: 'Becomes passive in concentrated HNO₃ due to the formation of a protective oxide layer.' },
                { el: 'Pb', name: 'Lead', fact: 'Shows the Inert Pair Effect strongly; its +2 oxidation state is much more stable than +4.' }
            ],
            init: function(id) {
                let html = `<h3 style="color:var(--gold); margin-top:0;">Tricky Elements Cheat Sheet</h3><p style="color:#cbd5e1; font-size:0.85rem; margin-top:-10px;">Click an element to reveal its famous JEE/NEET exception!</p><div style="display:flex; flex-wrap: wrap; gap:10px; justify-content:center; width:100%; max-height: 180px; overflow-y:auto;">`;
                
                this.data.forEach((item, i) => {
                    html += `<button class="btn" style="background:#1e293b; color:white; border:2px solid #475569; width: 60px; height: 60px; font-size:1.4rem; font-weight:bold; transition: 0.2s;" onmouseover="this.style.background='var(--gold)'; this.style.color='var(--primary)';" onmouseout="this.style.background='#1e293b'; this.style.color='white';" onclick="ArcGameEngine.periodic.showFact('${id}', ${i})">${item.el}</button>`;
                });
                
                html += `</div><div id="fact-box-${id}" style="margin-top:20px; background:rgba(251, 191, 36, 0.1); border:1px solid var(--gold); padding:15px; border-radius:8px; display:none; color:white; font-size:0.95rem; text-align:left; line-height: 1.5;"></div>`;
                document.getElementById(`game-bg-${id}`).innerHTML = html;
            },
            showFact: function(id, index) {
                const item = this.data[index];
                const box = document.getElementById(`fact-box-${id}`);
                box.innerHTML = `<strong style="color:var(--gold); font-size:1.1rem;">${item.name} (${item.el}):</strong><br>${item.fact}`;
                box.style.display = 'block';
            }
        },

        // --- 4. GUESS THE COMPOUND (CHEM WORDLE) ---
        guess: {
            data: [
                { clues: ["I give a positive silver mirror test (Tollen's).", "I do not undergo Aldol condensation.", "I am an aromatic compound."], ans: "Benzaldehyde" },
                { clues: ["I am a yellow precipitate.", "I form when methyl ketones react with I₂ / NaOH.", "I have strong antiseptic properties."], ans: "Iodoform" },
                { clues: ["I am an orange-red gas.", "I form when a chloride salt is heated with K₂Cr₂O₇ and conc. H₂SO₄.", "I am used to confirm Cl⁻ ions."], ans: "Chromyl Chloride" },
                { clues: ["I am a primary alcohol.", "Heating me with Copper at 573K gives an aldehyde.", "My formula is C₂H₆O."], ans: "Ethanol" },
                { clues: ["I am a cyclic ether.", "I am highly strained.", "I open my ring easily when attacked by a nucleophile."], ans: "Epoxide" }
            ],
            init: function(id) {
                window.arcGames.instances[id] = { qIndex: 0 };
                // Shuffle mysteries
                this.data.sort(() => 0.5 - Math.random());
                this.next(id);
            },
            next: function(id) {
                const state = window.arcGames.instances[id];
                if(state.qIndex >= this.data.length) {
                    document.getElementById(`game-bg-${id}`).innerHTML = `<h2 style="color:var(--green);">Sherlock of Chemistry! 🕵️‍♂️</h2><button class="btn btn-gold" onclick="ArcGameEngine.guess.init('${id}')">Play Again</button>`;
                    return;
                }
                
                const q = this.data[state.qIndex];
                let cluesHtml = q.clues.map((c, i) => `<li style="margin-bottom:8px; font-size:0.95rem; line-height: 1.4;">${c}</li>`).join('');
                
                document.getElementById(`game-bg-${id}`).innerHTML = `
                    <h3 style="color:var(--gold); margin-top:0;">Guess the Compound</h3>
                    <ul style="text-align:left; color:#e2e8f0; background:#1e293b; padding:15px 15px 15px 35px; border-radius:8px; border:1px solid #475569; margin-bottom: 20px;">${cluesHtml}</ul>
                    <input type="text" id="guess-input-${id}" placeholder="Type the compound name..." style="width:100%; padding:12px; border-radius:6px; border:2px solid var(--gold); background:white; color:black; font-weight:bold; margin-bottom:10px; text-align: center; box-sizing: border-box;">
                    <button class="btn btn-gold" style="width:100%;" onclick="ArcGameEngine.guess.check('${id}')">Submit Guess</button>
                `;
            },
            check: function(id) {
                const state = window.arcGames.instances[id];
                const q = this.data[state.qIndex];
                const input = document.getElementById(`guess-input-${id}`).value.trim().toLowerCase();
                
                // Allow generous matching (if they get a partial keyword right)
                if(input.length > 3 && q.ans.toLowerCase().includes(input)) {
                    document.getElementById(`game-bg-${id}`).innerHTML += `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(34, 197, 94, 0.95); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10;"><h2 style="color:white; font-size:2.5rem; margin-bottom:10px;">Spot On! ✅</h2><p style="color:white; font-size:1.2rem;">It was <b>${q.ans}</b></p><button class="btn" style="background:white; color:var(--green); margin-top:15px;" onclick="ArcGameEngine.guess.next('${id}')">Next Mystery</button></div>`;
                    state.qIndex++;
                } else {
                    document.getElementById(`guess-input-${id}`).value = "";
                    document.getElementById(`guess-input-${id}`).placeholder = "❌ Incorrect, try again!";
                    document.getElementById(`guess-input-${id}`).style.borderColor = "var(--red)";
                    // Shake animation
                    const inputEl = document.getElementById(`guess-input-${id}`);
                    inputEl.style.transform = 'translate(-5px, 0)';
                    setTimeout(() => inputEl.style.transform = 'translate(5px, 0)', 50);
                    setTimeout(() => inputEl.style.transform = 'translate(-5px, 0)', 100);
                    setTimeout(() => inputEl.style.transform = 'translate(0, 0)', 150);
                }
            }
        }
    };
    // ==========================================


    const toolbarHTML = `
        <div class="toolbar" style="background:#e2e8f0; padding:10px; border-radius:6px 6px 0 0; display:flex; gap:8px; flex-wrap:wrap; align-items:center; border:1px solid #ccc; border-bottom:none;">
            <select onchange="exec('fontName', this.value)" style="padding:5px; border-radius:4px;" title="Font">
                <option value="Arial">Arial</option><option value="'Times New Roman'">Times New Roman</option><option value="Courier New">Courier</option><option value="Georgia">Georgia</option><option value="Verdana">Verdana</option>
            </select>
            <select onchange="exec('fontSize', this.value)" style="padding:5px; border-radius:4px;" title="Size">
                <option value="3">Normal</option><option value="2">Small</option><option value="5">Large</option><option value="7">Huge</option>
            </select>
            <button class="tool-btn" onclick="exec('bold')" title="Bold"><b>B</b></button>
            <button class="tool-btn" onclick="exec('italic')" title="Italic"><i>I</i></button>
            <button class="tool-btn" onclick="exec('underline')" title="Underline"><u>U</u></button>
            <button class="tool-btn" onclick="exec('subscript')" title="Sub">X<sub>2</sub></button>
            <button class="tool-btn" onclick="exec('superscript')" title="Super">X<sup>2</sup></button>
            <div style="background:white; border:1px solid #999; border-radius:4px; padding:0 2px;"><input type="color" onchange="exec('foreColor', this.value)" style="height:25px; width:25px; border:none; cursor:pointer;"></div>
            
            <button class="tool-btn" onclick="exec('insertHorizontalRule')" title="Insert Page Break for Blog" style="background: #fbbf24; border: 1px solid #d97706; border-radius: 4px; padding: 2px 5px; font-weight: bold;">📄 Page Break</button>
            
            <label class="tool-btn" style="background: #3b82f6; color: white; border: 1px solid #2563eb; border-radius: 4px; padding: 2px 8px; font-weight: bold; cursor: pointer;" title="Insert Image or SVG at cursor">
                🖼️ Insert Image
                <input type="file" accept="image/*,.svg" onchange="insertInlineImage(this)" style="display:none;">
            </label>

            <select onchange="if(this.value.includes('<')) document.execCommand('insertHTML', false, this.value); else document.execCommand('insertText', false, this.value); this.value='';" style="padding:5px; border-radius:4px; font-weight:bold; color:#0f172a; max-width: 160px;" title="Chemistry Symbols & Arrows">
                <option value="">⚗️ Symbols & Arrows</option>
                
                <optgroup label="Reaction Arrows">
                    <option value=" &rarr; ">&rarr; (Reaction)</option>
                    <option value=" &rightleftharpoons; ">&rightleftharpoons; (Equilibrium)</option>
                    <option value=" &longleftrightarrow; ">&longleftrightarrow; (Resonance)</option>
                    <option value=" &rArr; ">&rArr; (Retrosynthesis)</option>
                    <option value="&nbsp;<span style='display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; margin:0 4px;'><span style='font-size:0.75rem; color:#d97706; font-weight:bold;'>Reagent</span><span style='line-height:0.8;'>&#10230;</span></span>&nbsp;">&rarr; (Reagent Above)</option>
                    <option value=" &uarr; ">&uarr; (Gas Evolved)</option>
                    <option value=" &darr; ">&darr; (Precipitate)</option>
                </optgroup>
                
                <optgroup label="Bonds & Math">
                    <option value=" &mdash; ">&mdash; (Single Bond)</option>
                    <option value=" = ">= (Double Bond)</option>
                    <option value=" &equiv; ">&equiv; (Triple Bond)</option>
                    <option value=" &bull; ">&bull; (Radical)</option>
                    <option value=" &deg; ">&deg; (Degree)</option>
                    <option value=" &plusmn; ">&plusmn; (Plus-Minus)</option>
                    <option value=" &approx; ">&approx; (Approx)</option>
                    <option value=" &Delta; ">&Delta; (Heat/Delta)</option>
                </optgroup>

                <optgroup label="Greek Letters">
                    <option value=" &alpha; ">&alpha; (Alpha)</option>
                    <option value=" &beta; ">&beta; (Beta)</option>
                    <option value=" &gamma; ">&gamma; (Gamma)</option>
                    <option value=" &delta; ">&delta; (Delta)</option>
                    <option value=" &pi; ">&pi; (Pi)</option>
                    <option value=" &sigma; ">&sigma; (Sigma)</option>
                </optgroup>
            </select>
        </div>`; 

    function showAdm(tab) {
        const c = document.getElementById('adm-content');
        
        if (tab === 'create-test') {
            c.innerHTML = `
                <div class="create-test-layout" style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div class="ct-left" style="flex: 3; min-width: 300px;">
                        <h3 style="border-bottom: 2px solid var(--gold); padding-bottom: 10px;">${editingTestId ? 'Edit' : 'Create'} Test</h3>
                        <div style="background:white; padding:15px; border:1px solid #ddd; border-radius:8px; margin-bottom:20px;">
                            <input id="t-title" placeholder="Test Title">
                            <div style="display:flex; gap:10px;">
                                <input id="t-dur" type="number" placeholder="Mins" oninput="calcEndTime()">
                                <input id="t-code" placeholder="Password (Optional)">
                                <input id="t-max-coins" type="number" placeholder="Max Coins to Earn">
                            </div>
                            <select id="t-cat"><option>11th Class</option><option>12th Class</option><option>Organic</option><option>Physical</option><option>Inorganic</option><option>Full Syllabus</option></select>
                            <div style="margin-top:10px; background:#f8fafc; padding:10px; border:1px solid #eee;">
                                <label><input type="checkbox" id="t-live"> 🔴 Live Test?</label>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:5px;">
                                    <div>Start: <input type="datetime-local" id="t-start" onchange="calcEndTime()" style="width:100%"></div>
                                    <div>End: <input type="datetime-local" id="t-end" readonly style="background:#eee; width:100%"></div>
                                </div>
                            </div>
                        </div>
                        <div style="background:white; padding:15px; border:1px solid #ddd; border-radius:8px;">
                            <h4>Add Question</h4>
                            ${toolbarHTML} 
                            <div id="q-editor" class="editor" contenteditable="true" placeholder="Question text..." style="min-height:100px; border-radius:0 0 6px 6px; margin-bottom:10px;"></div>
                            <input id="q-topic" placeholder="Chemistry Topic (e.g. Thermodynamics, GOC) for Tracker">
                            <div style="margin-bottom:15px;"><label class="btn-small" style="background:#e2e8f0; cursor:pointer;">📷 Q-Image <input type="file" onchange="encodeImg(this, 'q-prev')" style="display:none;"></label><img id="q-prev" style="height:60px; display:none; margin-top:5px;"></div>
                            <div style="background:#f1f5f9; padding:10px; border-radius:6px; margin-bottom:10px;">
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div><b>A:</b> <div id="op0" class="editor-small" contenteditable="true" style="background:white;"></div></div>
                                    <div><b>B:</b> <div id="op1" class="editor-small" contenteditable="true" style="background:white;"></div></div>
                                    <div><b>C:</b> <div id="op2" class="editor-small" contenteditable="true" style="background:white;"></div></div>
                                    <div><b>D:</b> <div id="op3" class="editor-small" contenteditable="true" style="background:white;"></div></div>
                                </div>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                                <select id="q-corr" style="width:auto; font-weight:bold; border:2px solid green;"><option value="0">Ans: A</option><option value="1">Ans: B</option><option value="2">Ans: C</option><option value="3">Ans: D</option></select>
                                <input type="number" id="q-marks" placeholder="+Ve" value="4" style="width:80px" title="Marks">
                                <input type="number" id="q-neg" placeholder="-Ve" value="0" style="width:80px" title="Negative">
                            </div>
                            <div style="border:1px solid #fbbf24; border-radius:6px; padding:10px; background:#fffbeb;">
                                <div style="font-weight:bold; color:#b45309; margin-bottom:5px;">💡 Solution</div>
                                <div id="q-sol" class="editor-small" contenteditable="true" style="background:white; min-height:60px;"></div>
                                <label class="btn-small" style="background:#fcd34d; cursor:pointer; margin-top:5px;">📷 Sol-Image <input type="file" id="q-sol-file" onchange="encodeImg(this, 'sol-prev', true)" style="display:none;"></label><img id="sol-prev" style="height:60px; display:none; margin-top:5px;">
                            </div>
                            <div style="margin-top:15px; display:flex; gap:10px;">
                                <button class="btn btn-gold" style="flex:1" onclick="saveDraftQ()">💾 Save Question</button>
                                <button class="btn btn-red" onclick="clearQForm()">Clear</button>
                            </div>
                        </div>
                    </div>
                    <div class="ct-right" style="flex: 1; min-width: 200px; background:white; padding:15px; border:1px solid #ddd; height:fit-content;">
                        <h4 style="text-align:center; margin-top:0;">Palette</h4>
                        <div id="create-palette" class="q-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:5px;"></div>
                        <hr>
                        <div style="text-align:center; margin-bottom:10px;">Total: <span id="q-count">0</span></div>
                        <button class="btn btn-red" style="width:100%" onclick="pubTest()">${editingTestId ? 'UPDATE TEST' : 'PUBLISH'}</button>
                    </div>
                </div>`;
            renderCreatePalette();
        }
        else if (tab === 'blog') {
            editingBlogId = null;
            c.innerHTML = `<h3>Post Blog</h3><input id="b-title" placeholder="Blog Title"><div style="margin:10px 0;"><b>Cover:</b> <input type="file" onchange="encodeImg(this, 'b-cover-prev')"><img id="b-cover-prev" style="height:100px; display:none;"></div>${toolbarHTML}<div id="b-content" class="editor" contenteditable="true" style="min-height:300px; margin-top:0; border-radius:0 0 6px 6px;"></div><button class="btn btn-gold" style="width:100%; margin-top:15px;" onclick="postBlog()">PUBLISH BLOG</button>`;
        }
        else if (tab === 'wheel') {
            c.innerHTML = `<h3>Manage Fortune Wheel Offers</h3>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px;">
                <input id="w-label" placeholder="Slice Label (e.g., 50 Coins, Try Again)">
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <select id="w-type" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ccc;">
                        <option value="coins">Reward: ARC Coins</option>
                        <option value="discount">Reward: Custom Discount</option>
                        <option value="none">Reward: Nothing (Try Again)</option>
                    </select>
                    <input id="w-val" type="number" placeholder="Value (e.g. 50)" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ccc;">
                    <input id="w-color" type="color" value="#fbbf24" style="flex:0.5; height:42px; padding:0; border:1px solid #ccc; cursor:pointer;" title="Slice Color">
                </div>
                <button class="btn btn-gold" style="width:100%; margin-top:15px;" onclick="addWheelPrize()">➕ Add to Wheel</button>
            </div>
            <hr>
            <h4>Current Wheel Slices</h4>
            <div id="admin-wheel-list" class="table-container">Loading...</div>`;
            loadAdminWheelList();
        }

        else if (tab === 'offline') {
            if(!editingOfflineId) offlineDraft = []; 
            c.innerHTML = `<h3>Offline Result</h3><input id="off-title" placeholder="Test Title"><div class="input-group" style="grid-template-columns: 2fr 1fr 1fr 2fr auto;"><input id="off-name" placeholder="Name"><input id="off-total" placeholder="Total"><input id="off-obt" placeholder="Obt"><input id="off-link" placeholder="Drive Link"><button class="btn btn-gold" onclick="addOfflineStudent()">Add</button></div><div class="table-container"><table style="margin:0;"><thead><tr><th>Name</th><th>Mks</th><th>Link</th><th>Del</th></tr></thead><tbody id="off-preview-body"></tbody></table></div><button class="btn btn-red" style="width:100%" onclick="postOffline()">${editingOfflineId ? 'UPDATE' : 'UPLOAD'}</button>`;
            if(editingOfflineId) renderOfflineDraft();
        }
        else if (tab === 'manage') {
            c.innerHTML = `<h3>Manage Content</h3><div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">
                <button class="btn btn-gold btn-small" onclick="loadManageTests()">Tests</button>
                <button class="btn btn-gold btn-small" onclick="loadManageBlogs()">Blogs</button>
                <button class="btn btn-gold btn-small" onclick="loadManageLibrary()">Library</button>
                <button class="btn btn-gold btn-small" onclick="loadManageOffline()">Offline</button>
                <button class="btn btn-gold btn-small" onclick="loadManageSchedule()">Schedule</button>
                <button class="btn btn-gold btn-small" onclick="loadManageStudents()">Students</button>
                </div><div id="manage-area" class="table-container">Select a category above.</div>`;
        }
        else if (tab === 'upload') {
            c.innerHTML = `<h3>${editingMaterialId ? 'Edit' : 'Upload'} File</h3>
            <input id="m-title" placeholder="Title">
            <input id="m-link" placeholder="Link (e.g., Drive/OneDrive)">
            <div style="margin:10px 0; border:1px solid #ccc; padding:10px; border-radius:6px;">
                 <b>Thumbnail Image:</b>
                 <input type="file" onchange="encodeImg(this, 'm-prev')" style="margin-top:5px;">
                 <img id="m-prev" style="height:100px; margin-top:10px; display:none; object-fit:contain; border:1px solid #ddd;">
            </div>
           <select id="m-cat">
    <option>11th Class Books</option>
    <option>12th Class Books</option>
    <option>Organic Topics</option>
    <option>Physical Topics</option>
    <option>Inorganic Topics</option>
    <option>Coaching Notes</option>
    <option>Test Series Files</option>
</select>
            <input id="m-code" placeholder="Pass (Opt)">
            <button class="btn btn-gold" style="width:100%; margin-top:10px;" onclick="uploadMat()">${editingMaterialId ? 'UPDATE' : 'UPLOAD'}</button>`;
        }
        else if (tab === 'video') {
            c.innerHTML = `<h3>Add Video Lecture</h3>
            <input id="v-title" placeholder="Video Title">
            <input id="v-link" placeholder="YouTube Embed Link (e.g. https://www.youtube.com/embed/...)">
            <select id="v-cat"><option>Organic</option><option>Physical</option><option>Inorganic</option><option>Misc</option></select>
            <button class="btn btn-gold" style="width:100%; margin-top:10px;" onclick="uploadVideo()">Add Video</button>
            <hr><h4>Manage Videos</h4><div id="admin-video-list" class="table-container"></div>`;
            fetch('/api/videos').then(r=>r.json()).then(d => { 
                document.getElementById('admin-video-list').innerHTML = `<table><tr><th>Title</th><th>Cat</th><th>Action</th></tr>${d.map(v=>`<tr><td>${v.title}</td><td>${v.category}</td><td><button class="btn-red btn-small" onclick="deleteItem('video','${v._id}')">Del</button></td></tr>`).join('')}</table>`;
            });
        }
        else if (tab === 'potd') {
            const today = new Date().toLocaleDateString('en-CA');
            c.innerHTML = `<h3>Set Problem of the Day</h3>
            <label>Date: <input type="date" id="potd-date" value="${today}"></label>
            ${toolbarHTML}
            <div id="potd-text" class="editor" contenteditable="true" style="min-height:80px; margin-top:10px;" placeholder="Question..."></div>
            <label class="btn-small" style="background:#e2e8f0; cursor:pointer; display:inline-block; margin:10px 0;">📷 Add Image <input type="file" onchange="encodeImg(this, 'potd-img')" style="display:none;"></label><img id="potd-img" style="height:60px; display:none; margin-left:10px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <input id="po0" placeholder="Option A"><input id="po1" placeholder="Option B">
                <input id="po2" placeholder="Option C"><input id="po3" placeholder="Option D">
            </div>
            <select id="potd-corr" style="border:2px solid green; font-weight:bold; margin-bottom:10px;"><option value="0">Ans A</option><option value="1">Ans B</option><option value="2">Ans C</option><option value="3">Ans D</option></select>
            <div style="background:#fffbeb; padding:10px; border:1px solid #fbbf24; border-radius:6px;">
                <b>Solution:</b><div id="potd-sol" class="editor-small" contenteditable="true" style="background:white; min-height:50px;"></div>
                <label class="btn-small" style="background:#fcd34d; cursor:pointer; margin-top:5px;">📷 Sol-Image <input type="file" onchange="encodeImg(this, 'potd-sol-img', true)" style="display:none;"></label><img id="potd-sol-img" style="height:50px; display:none;">
            </div>
            <button class="btn btn-gold" style="width:100%; margin-top:15px;" onclick="uploadPOTD()">Set POTD</button>
            <hr>
            <h4>Manage POTDs</h4>
            <div class="table-container">
                <table>
                    <thead><tr><th>Date</th><th>Question Info</th><th>Action</th></tr></thead>
                    <tbody id="potd-list"></tbody>
                </table>
            </div>`;

            fetch('/api/admin/potds').then(r=>r.json()).then(d => {
                window.allPOTDs = d; 
                document.getElementById('potd-list').innerHTML = d.map((p, i) => `<tr>
                    <td>${p.dateStr}</td>
                    <td>${p.text.replace(/<[^>]*>?/gm, '').substring(0, 30)}...</td>
                    <td>
                        <button class="btn btn-gold btn-small" onclick="editPOTD(${i})">Edit</button>
                        <button class="btn btn-red btn-small" onclick="deleteItem('potd','${p._id}')">Del</button>
                    </td>
                </tr>`).join('');
            });
        }
        else if (tab === 'logo') {
            // FEATURE: DYNAMIC LOGO UPLOAD PANEL
            c.innerHTML = `<h3>Website Logo Settings</h3>
            <div style="background:#f8fafc; padding:20px; border-radius:10px; border:1px solid #e2e8f0;">
                <label style="font-weight:bold; color:var(--primary);">Upload Coaching Logo</label>
                <p style="font-size:0.85rem; color:#666;">This logo will appear in the website header and browser tab. Use a square image for best results.</p>
                <input type="file" id="logo-input" accept="image/*" onchange="encodeImg(this, 'admin-logo-prev')" style="margin-bottom:10px;">
                <div style="padding:10px; background:white; border:1px dashed #ccc; border-radius:8px; display:inline-block;">
                    <img id="admin-logo-prev" style="height:80px; width:80px; object-fit:contain; display:none;">
                </div>
                <button class="btn btn-gold" style="width:100%; margin-top:15px;" onclick="saveSiteLogo()">💾 Save Logo</button>
            </div>`;
            fetch('/api/logo').then(r=>r.json()).then(d => {
                if(d.logo) {
                    document.getElementById('admin-logo-prev').src = d.logo;
                    document.getElementById('admin-logo-prev').style.display = 'block';
                    tempImg = d.logo;
                }
            });
        }
        else if (tab === 'doubts') {
            c.innerHTML = `<h3>Manage Student Doubts</h3><div id="admin-doubt-list">Loading...</div>`;
            fetch('/api/admin/doubts').then(r=>r.json()).then(d => {
                window.adminDoubts = d; 
                document.getElementById('admin-doubt-list').innerHTML = d.map(db => `
                <div class="card doubt-card ${db.status === 'Answered' ? 'answered' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${db.studentName}</b> <span class="badge ${db.status === 'Answered' ? 'bg-green' : 'bg-red'}">${db.status}</span></div>
                        <button class="btn btn-red btn-small" onclick="deleteItem('doubt', '${db._id}')">🗑️ Delete</button>
                    </div>
                    <p style="margin-top: 10px;">${db.text}</p>
                    ${db.image ? (db.image.startsWith('data:application/pdf') ? 
    `<div style="margin-top:10px;"><button class="btn btn-gold btn-small" onclick="openPdfViewer('Attached PDF', '${db.image}')">📄 View PDF Attachment</button></div>` : 
    `<img src="${db.image}" style="height:100px; border:1px solid #ccc; cursor:pointer; margin-top:10px;" onclick="openPdfViewer('Student Image', '${db.image}')" title="Click to enlarge">`
) : ''}
                    <hr>
                    ${db.status === 'Pending' ? `
                        <textarea id="reply-text-${db._id}" placeholder="Type reply..." style="width:100%; padding:8px; border-radius:6px;"></textarea>
                        <input type="file" onchange="encodeImg(this, 'reply-img-${db._id}')" style="margin:5px 0;">
                        <img id="reply-img-${db._id}" style="height:80px; display:none;">
                        <br><button class="btn btn-gold btn-small" style="margin-top:5px;" onclick="replyDoubt('${db._id}')">Send Reply</button>
                    ` : `
                        <div id="doubt-ans-container-${db._id}" style="background:#f0f9ff; padding:10px; border-radius:6px;">
                            <b>Reply:</b> ${db.replyText} ${db.replyImage ? `<br><img src="${db.replyImage}" style="height:100px; margin-top:5px;">` : ''}
                            <div style="margin-top: 10px;">
                                <button class="btn btn-gold btn-small" onclick="editDoubtReply('${db._id}')">✏️ Edit Reply</button>
                            </div>
                        </div>
                    `}
                </div>`).join('');
            });
        }
        else if (tab === 'reftool') {
            c.innerHTML = `<h3>Manage Reference Tools</h3>
            <input id="rt-title" placeholder="Tool Name (e.g. Periodic Table)">
            <div style="margin:10px 0; border:1px solid #ccc; padding:10px; border-radius:6px;">
                 <b>Upload Image:</b> <input type="file" onchange="encodeImg(this, 'rt-prev')" style="margin-top:5px;">
                 <img id="rt-prev" style="height:100px; display:none; margin-top:10px;">
            </div>
            <button class="btn btn-gold" style="width:100%;" onclick="uploadRefTool()">Add Tool</button>
            <hr><h4>Current Tools</h4><div id="admin-rt-list" class="table-container"></div>`;
            fetch('/api/reftools').then(r=>r.json()).then(d => {
                document.getElementById('admin-rt-list').innerHTML = `<table><tr><th>Title</th><th>Image</th><th>Action</th></tr>${d.map(rt=>`<tr><td>${rt.title}</td><td><img src="${rt.image}" style="height:40px; border-radius:4px;"></td><td><button class="btn-red btn-small" onclick="deleteItem('reftool','${rt._id}')">Del</button></td></tr>`).join('')}</table>`;
            });
        }
        else if (tab === 'students') {
            c.innerHTML = `<h3>Registered Students</h3><div class="table-container"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody id="stu-list"></tbody></table></div>`;
            fetch('/api/admin/students').then(r=>r.json()).then(d => { 
                document.getElementById('stu-list').innerHTML = d.map(s => `<tr>
                    <td>${s.name}</td>
                    <td>${s.email}</td>
                    <td>${s.phone || 'N/A'}</td>
                    <td><span class="badge ${s.status === 'Approved' ? 'bg-green' : 'bg-red'}">${s.status || 'Approved'}</span></td>
                    <td>
                        ${s.status === 'Pending' ? `<button class="btn btn-green btn-small" style="background:green;color:white;" onclick="approveStudent('${s._id}')">Approve</button>` : ''}
                        <button class="btn btn-gold btn-small" onclick="editStudent('${s._id}')">Edit</button> 
                        <button class="btn btn-red btn-small" onclick="deleteItem('student','${s._id}')">Del</button>
                    </td>
                </tr>`).join(''); 
            });
        }
        else if (tab === 'results') {
            c.innerHTML = `<h3>Online Results</h3><input placeholder="Search..." onkeyup="filterTable(this)"><div class="table-container"><table><thead><tr><th>Student</th><th>Test</th><th>Score</th><th>Action</th></tr></thead><tbody id="adm-res-list"></tbody></table></div>`;
            fetch('/api/admin/results/online').then(r=>r.json()).then(d => { document.getElementById('adm-res-list').innerHTML = d.map(r => `<tr><td>${r.studentName}</td><td>${r.testTitle}</td><td>${r.score}</td><td><button class="btn btn-gold btn-small" onclick="viewSheet('${r._id}')">View</button> <button class="btn btn-red btn-small" onclick="deleteItem('result','${r._id}')">Del</button></td></tr>`).join(''); });
        }
        else if (tab === 'add-schedule') {
            c.innerHTML = `<h3>${editingScheduleId ? 'Edit' : 'Add'} Test Schedule</h3>
            <select id="s-cls"><option>11th Class</option><option>12th Class</option><option>Dropper</option></select>
            <input id="s-topic" placeholder="Test Topic">
            <input id="s-pass" placeholder="Password (Optional)">
            <label>Test Time:</label>
            <input type="datetime-local" id="s-time">
            <button class="btn btn-gold" style="width:100%; margin-top:15px;" onclick="saveSchedule()">${editingScheduleId ? 'UPDATE SCHEDULE' : 'ADD SCHEDULE'}</button>`;
        }
        else if (tab === 'mech') {
            c.innerHTML = `<h3>Manage Reactions & Mechanisms</h3>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px;">
                <input id="mech-id" placeholder="Short ID (e.g., sn1, aldol)" style="font-family: monospace; text-transform: lowercase;">
                <input id="mech-title" placeholder="Full Title (e.g., SN1 Reaction)">
                <textarea id="mech-desc" rows="3" placeholder="Overview Description..."></textarea>
                
                <div style="background: white; padding: 15px; border: 2px dashed #cbd5e1; border-radius: 6px; margin-top: 15px;">
                    <h4 style="margin-top: 0; color: var(--primary);">Add a Step</h4>
                    <input id="mech-step-title" placeholder="Step Title (e.g., Leaving Group Departs)">
                    <textarea id="mech-step-text" rows="2" placeholder="Explanation of this step..."></textarea>
                    
                    <div style="margin-top: 10px; padding: 10px; background: #f1f5f9; border-radius: 6px;">
                        <b>Step Image/SVG:</b><br>
                        <input type="file" accept="image/*,.svg" onchange="encodeImg(this, 'mech-step-img')" style="margin-top: 5px;">
                        <img id="mech-step-img" style="max-height: 100px; display: none; margin-top: 10px; border: 1px solid #ccc; background: white; padding: 5px;">
                    </div>
                    
                    <button class="btn btn-gold" style="width: 100%; margin-top: 10px;" onclick="addMechStepToDraft()">➕ Add Step to Draft</button>
                </div>

                <div id="mech-draft-steps" style="margin-top: 15px;"></div>
                
                <button class="btn btn-red" style="width: 100%; margin-top: 15px; font-size: 1.1rem;" onclick="uploadMechanism()">💾 Save Complete Mechanism</button>
            </div>
            <hr>
            <h4>Current Mechanisms</h4>
            <div id="admin-mech-list" class="table-container">Loading...</div>`;
            
            // Initialize draft array and load existing ones
            window.mechDraftSteps = []; 
            loadAdminMechList();
        }
            else if (tab === 'store') {
                c.innerHTML = `<h3>Manage Store Items</h3>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px;">
                    <input id="store-title" placeholder="Item Title (e.g., Ultimate Organic Cheat Sheet)">
                    <div style="display:flex; gap:10px;">
                        <select id="store-type" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ccc;" onchange="updateStoreInputUI()">
                            <option value="pdf">📄 Premium PDF (Link from Library)</option>
                            <option value="test">🔒 Mock Test (Link from Practice Tests)</option>
                            <option value="video">📹 Secret Video Link</option>
                            <option value="discount">💸 Offline Fee Discount</option>
                        </select>
                        <input id="store-cost" type="number" placeholder="Coin Cost" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ccc;">
                    </div>
                    <div id="store-link-container" style="margin-top:10px;"></div>
                    <button class="btn btn-gold" style="width:100%; margin-top:15px; font-size:1.1rem;" onclick="uploadStoreItem()">➕ Add to Store</button>
                </div>
                <hr>
                <h4>Current Store Items</h4>
                <div id="admin-store-list" class="table-container">Loading...</div>`;
                
                updateStoreInputUI(); // Initialize dynamic dropdown
                loadAdminStoreList();
            }
        else if (tab === 'discounts') {
            c.innerHTML = `<h3>Offline Discount Verifications</h3>
            <p style="color:#666;">Cross-check the verification codes presented by students here.</p>
            <div class="table-container">
                <table style="width:100%;">
                    <thead><tr><th>Date</th><th>Student Details</th><th>Code</th><th>Item</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody id="admin-discount-list"><tr><td colspan="6" style="text-align:center;">Loading...</td></tr></tbody>
                </table>
            </div>`;
            loadAdminDiscounts();
        }

        else if (tab === 'announce') {
             c.innerHTML = `<h3>News</h3><input id="ann-text" placeholder="Text"><button class="btn btn-gold" onclick="postAnnounce()">Post</button><div id="ann-list" style="margin-top:20px;"></div>`;
             fetch('/api/announcement').then(r=>r.json()).then(d => { document.getElementById('ann-list').innerHTML = d.list.map(t => `<div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">${t} <button onclick="delAnnounce('${t}')">X</button></div>`).join(''); });
        }
    }

    async function loadManageTests() { const res = await fetch('/api/tests'); const data = await res.json(); document.getElementById('manage-area').innerHTML = `<table><tr><th>Title</th><th>Action</th></tr>${data.map(t => `<tr><td>${t.title}</td><td><button onclick="editTest('${t._id}')">Edit</button> <button style="color:red" onclick="deleteItem('test','${t._id}')">Del</button></td></tr>`).join('')}</table>`; }
   
    async function loadManageBlogs() { 
    try {
        document.getElementById('manage-area').innerHTML = "<p style='padding:15px; text-align:center;'>Loading...</p>";
        const res = await fetch('/api/blogs'); 
        const data = await res.json(); 
        
        // Ensure it's an array before mapping to prevent crashes
        const blogs = Array.isArray(data) ? data : [];
        if(blogs.length === 0) {
            document.getElementById('manage-area').innerHTML = "<p style='padding:15px; text-align:center; color:#666;'>No blogs published yet.</p>";
            return;
        }
        
        document.getElementById('manage-area').innerHTML = `<table><tr><th>Title</th><th>Action</th></tr>${blogs.map(b => `<tr><td>${b.title}</td><td><button class="btn btn-gold btn-small" onclick="editBlog('${b._id}')">Edit</button> <button class="btn btn-red btn-small" onclick="deleteItem('blog','${b._id}')">Del</button></td></tr>`).join('')}</table>`; 
    } catch(e) {
        document.getElementById('manage-area').innerHTML = "<p style='color:var(--red); padding:15px;'>Error loading blogs.</p>";
        console.error("Blog Load Error:", e);
    }
}

    async function loadManageLibrary() { 
    try {
        document.getElementById('manage-area').innerHTML = "<p style='padding:15px; text-align:center;'>Loading...</p>";
        const res = await fetch('/api/materials'); 
        const data = await res.json(); 
        
        // Ensure it's an array before mapping to prevent crashes
        const mats = Array.isArray(data) ? data : [];
        if(mats.length === 0) {
            document.getElementById('manage-area').innerHTML = "<p style='padding:15px; text-align:center; color:#666;'>No library materials found.</p>";
            return;
        }
        
        document.getElementById('manage-area').innerHTML = `<table><tr><th>Title</th><th>Action</th></tr>${mats.map(m => `<tr><td>${m.title}</td><td><button class="btn btn-gold btn-small" onclick="editMaterial('${m._id}')">Edit</button> <button class="btn btn-red btn-small" onclick="deleteItem('material','${m._id}')">Del</button></td></tr>`).join('')}</table>`; 
    } catch(e) {
        document.getElementById('manage-area').innerHTML = "<p style='color:var(--red); padding:15px;'>Error loading library.</p>";
        console.error("Library Load Error:", e);
    }
}



    async function loadManageOffline() { const res = await fetch('/api/results/offline'); const data = await res.json(); document.getElementById('manage-area').innerHTML = `<table><tr><th>Title</th><th>Action</th></tr>${data.map(r => `<tr><td>${r.title}</td><td><button onclick="editOffline('${r._id}')">Edit</button> <button style="color:red" onclick="deleteItem('offline-result','${r._id}')">Del</button></td></tr>`).join('')}</table>`; }
    
    async function loadManageStudents() { showAdm('students'); }

    async function editStudent(id) { 
        const res = await fetch(`/api/admin/student/${id}`); 
        const s = await res.json(); 
        const newName = prompt("Name:", s.name); 
        const newPass = prompt("Pass:", s.password); 
        if(newName && newPass) { 
            await fetch(`/api/admin/student/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: newName, password: newPass }) }); 
            alert("Updated!"); showAdm('students'); 
        } 
    }

    async function approveStudent(id) {
        await fetch(`/api/admin/student/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'Approved' }) });
        alert("Student Approved! They can now log in."); showAdm('students');
    }

    async function deleteItem(type, id) { 
        if(!confirm("Permanently delete?")) return; 
        await fetch(`/api/admin/${type}/${id}`, { method: 'DELETE' }); 
        alert("Deleted."); 
        if(type==='student') showAdm('students');
        else if(type==='result') { if(document.getElementById('adm-res-list')) showAdm('results'); else loadManageOnline(); }
        else if(type==='offline-result') { if(document.getElementById('manage-area') && document.getElementById('manage-area').style.display !== 'none') loadManageOffline(); else showAdm('offline'); }
        else if(type==='test') loadManageTests();
        else if(type==='blog') loadManageBlogs();
        else if(type === 'schedule') loadManageSchedule();
        else if(type==='material') loadManageLibrary();
        else if(type === 'story') loadStories();
        else if(type === 'video') showAdm('video'); 
        else if(type === 'reftool') { showAdm('reftool'); loadRefToolsStudent(); } 
        else if(type === 'potd') { showAdm('potd'); loadPOTD(); } 
        else if(type === 'mechanism') { loadAdminMechList(); }
        else if(type === 'store') { loadAdminStoreList(); loadDynamicStore(); }
        else if(type === 'discount-log') { loadAdminDiscounts(); }
        else if(type === 'doubt') { showAdm('doubts'); }
        else if(type === 'wheel') loadAdminWheelList();
    }

    function initCreateTest() { editingTestId = null; draftQ = []; showAdm('create-test'); renderCreatePalette(); }
    function initUpload() { editingMaterialId = null; showAdm('upload'); } 
    function toLocalISOString(date) { const localDate = new Date(date - date.getTimezoneOffset() * 60000); return localDate.toISOString().slice(0, 16); }
    function calcEndTime() { const startVal = document.getElementById('t-start').value; const durVal = document.getElementById('t-dur').value; if (startVal && durVal) { const start = new Date(startVal); const end = new Date(start.getTime() + parseInt(durVal) * 60000); document.getElementById('t-end').value = toLocalISOString(end); } }
    
    async function editTest(id) { const res = await fetch(`/api/admin/test/${id}`); const test = await res.json(); initCreateTest(); document.getElementById('t-title').value = test.title; document.getElementById('t-dur').value = test.duration; document.getElementById('t-code').value = test.accessCode || ""; document.getElementById('t-cat').value = test.category; document.getElementById('t-live').checked = test.isLive; if(test.startTime) document.getElementById('t-start').value = toLocalISOString(new Date(test.startTime)); if(test.endTime) document.getElementById('t-end').value = toLocalISOString(new Date(test.endTime)); draftQ = test.questions || []; renderCreatePalette(); editingTestId = id; document.querySelector("button[onclick='pubTest()']").innerText = "UPDATE TEST"; }
    
    
    async function editBlog(id) { 
    // Fetch if the global array is empty
    if (!allBlogs || allBlogs.length === 0) await loadBlogs();
    
    const blog = allBlogs.find(b => b._id === id); 
    if (!blog) return alert("Blog not found!"); 
    
    showAdm('blog'); // Renders the tab (which resets editingBlogId)
    editingBlogId = id; // Re-assign the correct ID immediately after
    
    // Update the UI headers dynamically so it doesn't say "Post Blog"
    document.querySelector('#adm-content h3').innerText = "Edit Blog";
    document.querySelector('#adm-content button[onclick="postBlog()"]').innerText = "UPDATE BLOG";
    
    document.getElementById('b-title').value = blog.title; 
    document.getElementById('b-content').innerHTML = blog.content; 
    
    if (blog.image) { 
        document.getElementById('b-cover-prev').src = blog.image; 
        document.getElementById('b-cover-prev').style.display = 'block'; 
        tempImg = blog.image; 
    } else {
        document.getElementById('b-cover-prev').style.display = 'none'; 
        tempImg = "";
    }
}


    async function editMaterial(id) { 
    // Fetch if the global array is empty
    if (!allMats || allMats.length === 0) await loadMaterials(); 
    
    const mat = allMats.find(m => m._id === id); 
    if (!mat) return alert("Material not found!"); 
    
    editingMaterialId = id; 
    showAdm('upload'); 
    
    document.getElementById('m-title').value = mat.title; 
    document.getElementById('m-link').value = mat.link; 
    
    // Safety check for dropdown mapping
    const catDropdown = document.getElementById('m-cat');
    if(catDropdown) catDropdown.value = mat.category; 
    
    document.getElementById('m-code').value = mat.accessCode || ""; 
    
    if (mat.image) { 
        document.getElementById('m-prev').src = mat.image; 
        document.getElementById('m-prev').style.display = 'block'; 
        tempImg = mat.image; 
    } else { 
        document.getElementById('m-prev').style.display = 'none';
        tempImg = ""; 
    }
}


    async function editOffline(id) { const res = await fetch(`/api/admin/offline-result/${id}`); const data = await res.json(); editingOfflineId = id; offlineDraft = data.records; showAdm('offline'); document.getElementById('off-title').value = data.title; renderOfflineDraft(); }

    async function uploadMat() { 
    const body = { title: document.getElementById('m-title').value, link: document.getElementById('m-link').value, image: tempImg, category: document.getElementById('m-cat').value, accessCode: document.getElementById('m-code').value }; 
    const method = editingMaterialId ? 'PUT' : 'POST'; const url = editingMaterialId ? `/api/admin/material/${editingMaterialId}` : '/api/admin/material'; 
    await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); 
    alert(editingMaterialId ? "Updated!" : "Uploaded!"); 
    editingMaterialId = null; tempImg = ""; showAdm('upload'); 
    loadMaterials(); // ADD THIS LINE TO AUTO-REFRESH THE LIBRARY
}

    function addOfflineStudent() { const name = document.getElementById('off-name').value; 
        const total = document.getElementById('off-total').value; 
        const obt = document.getElementById('off-obt').value; 
        const link = document.getElementById('off-link').value; 
        if(!name || !total || !obt) return alert("Fill details"); 
        offlineDraft.push({ studentName: name, totalMarks: total, obtainedMarks: obt, copyLink: link }); 
        renderOfflineDraft(); document.getElementById('off-name').value = ""; 
        document.getElementById('off-obt').value = ""; 
        document.getElementById('off-link').value = ""; }

    
    function renderOfflineDraft() { document.getElementById('off-preview-body').innerHTML = offlineDraft.map((s, i) => `<tr><td>${s.studentName}</td><td>${s.totalMarks}</td><td>${s.obtainedMarks}</td><td>${s.copyLink?'Yes':'No'}</td><td><button style="color:red" onclick="offlineDraft.splice(${i},1); renderOfflineDraft()">X</button></td></tr>`).join(''); }
    
    async function postOffline() { if(offlineDraft.length === 0) return alert("No Data"); 
        const method = editingOfflineId?'PUT':'POST'; 
        const url = editingOfflineId?`/api/admin/offline-result/${editingOfflineId}`:'/api/admin/offline-result'; 
        await fetch(url, { method, headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ title: document.getElementById('off-title').value, records: offlineDraft }) }); 
            alert("Saved!"); offlineDraft = []; editingOfflineId = null; showAdm('offline'); }

    
    function exec(cmd, val=null) { document.execCommand(cmd, false, val); }

    // Inserts an image or SVG directly into the text editor at the cursor position
    function insertInlineImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                // Uses the browser's native editor command to insert the image
                document.execCommand('insertImage', false, base64Data);
            };
            reader.readAsDataURL(input.files[0]);
        }
        // Reset the input so you can upload the same image again if needed
        input.value = ""; 
    }

    function insChar(char) { document.execCommand('insertText', false, char); }

    function encodeImg(input, previewId, isSolution = false) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Cap maximum width/height at 800px to prevent massive payloads
            const scale = Math.min(800 / img.width, 800 / img.height, 1);
            canvas.width = img.width * scale; 
            canvas.height = img.height * scale;
            
            // Draw and compress to 70% quality JPEG
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); 
            
            if (isSolution) tempSolImg = compressedBase64; else tempImg = compressedBase64;
            if (previewId) {
                const preview = document.getElementById(previewId);
                preview.src = compressedBase64;
                preview.style.display = 'block';
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
}
    
    function switchTab(mode) { loginMode = mode; document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); document.getElementById('tab-'+mode).classList.add('active'); document.getElementById('student-input').style.display = mode === 'student' ? 'block' : 'none'; document.getElementById('teacher-input').style.display = mode === 'student' ? 'none' : 'block'; document.getElementById('login-title').innerText = mode === 'student' ? 'Student Login' : 'Teacher Login'; }
  
    async function doReg() { 
        const phone = document.getElementById('r-phone').value;
        if(phone.length !== 10) return alert("Please enter a valid 10-digit phone number.");
        const res = await fetch('/api/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: document.getElementById('r-name').value, emailPart: document.getElementById('r-prefix').value, password: document.getElementById('r-pass').value, phone }) }); 
        const data = await res.json(); 
        if(data.success) { alert("Registered successfully! Your registration is under review. You will be able to log in once the teacher approves it."); location.reload(); } else { alert(data.message); }
    }

    async function doLogin() { 
        let email = loginMode === 'student' ? document.getElementById('l-email').value : document.getElementById('l-admin-email').value;
        const password = document.getElementById('l-pass').value;
        if (!email || !password) { alert("Please enter both email and password."); return; }
        if(loginMode === 'student' && !email.includes('@')) email += '@arcstudent.com';
        
        try {
            const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password, role: loginMode }) });
            const data = await res.json();
            if(data.success) {
                const userData = {name: data.name, email: data.email, role: data.role};
                localStorage.setItem('arc_user', JSON.stringify(userData)); user = userData;
                // 👉 PLAY WELCOME VOICE HERE
                playWelcomeVoice(userData.name);
                showWelcomePopup(userData.name);

                document.getElementById('nav-login').style.display = 'none';
                // Show welcome popup
        // FEATURE: VISUAL WELCOME POPUP
    function showWelcomePopup(name) {
        const popup = document.getElementById('welcome-popup');
        const textEl = document.getElementById('welcome-popup-text');
        
        // Grab just the first name
        const firstName = name.split(' ')[0]; 
        textEl.innerText = `Welcome back, ${firstName}`;
        
        // Slide it up
        popup.classList.add('show');
        
        // Hide it automatically after 4 seconds
        setTimeout(() => {
            popup.classList.remove('show');
        }, 4000);
    }

                document.getElementById('nav-login').style.display = 'none'; document.getElementById('nav-logout').style.display = 'block'; document.getElementById('nav-doubts').style.display = 'block'; 
                if(user.role === 'admin') document.getElementById('nav-admin').style.display = 'block';
                show('home'); 
            } else { alert(data.message || "Invalid Email or Password"); }
        } catch(e) { alert("Server connection error. Please try again."); } 
    }

    function logout() { localStorage.removeItem('arc_user'); localStorage.removeItem('arc_last_section'); clearSession(); location.reload(); }

    // FEATURE: DYNAMIC FEMALE WELCOME VOICE
    function playWelcomeVoice(name) {
        if ('speechSynthesis' in window) {
            // Stop any currently playing speech
            window.speechSynthesis.cancel();
            
            // Grab just the first name
            const firstName = name.split(' ')[0]; 
            const msg = new SpeechSynthesisUtterance(`Welcome to A R C Classes, ${firstName}`);
            
            // Tweak settings for a more natural, feminine tone
            msg.rate = 0.9;  
            msg.pitch = 1.2; // Slightly higher pitch
            
            // Function to find a female voice and speak
            const speakWithFemaleVoice = () => {
                const voices = window.speechSynthesis.getVoices();
                
                // Search for common female voices across Windows, Mac, iOS, and Android
                let femaleVoice = voices.find(voice => 
                    voice.name.includes('Female') || 
                    voice.name.includes('Zira') ||       // Windows
                    voice.name.includes('Samantha') ||   // Apple/Mac
                    voice.name.includes('Victoria') ||   // Apple/Mac
                    voice.name.includes('Google UK English Female') || // Android/Chrome
                    voice.name.includes('Google US English') // Android/Chrome (often female by default)
                );
                
                // If a female voice is found, apply it
                if (femaleVoice) {
                    msg.voice = femaleVoice;
                }
                
                // Play the voice
                window.speechSynthesis.speak(msg);
            };

            // Browsers sometimes take a millisecond to load voices, so we check if they are ready
            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    speakWithFemaleVoice();
                    window.speechSynthesis.onvoiceschanged = null; // Prevent it from triggering twice
                };
            } else {
                speakWithFemaleVoice();
            }
        }
    }


    async function pubTest() { 
        const body = { 
            title: document.getElementById('t-title').value, 
            duration: parseInt(document.getElementById('t-dur').value), 
            maxCoins: parseInt(document.getElementById('t-max-coins').value), 
            accessCode: document.getElementById('t-code').value, 
            category: document.getElementById('t-cat').value, 
            isLive: document.getElementById('t-live').checked, 
            startTime: document.getElementById('t-start').value ? new Date(document.getElementById('t-start').value) : null, 
            endTime: document.getElementById('t-end').value ? new Date(document.getElementById('t-end').value) : null, 
            questions: draftQ 
        }; 
        const method = editingTestId ? 'PUT' : 'POST'; 
        const url = editingTestId ? `/api/admin/test/${editingTestId}` : '/api/admin/test'; 
        try { 
            await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }); 
            alert(editingTestId ? "Updated!" : "Published!"); 
            editingTestId = null; 
            draftQ = []; 
            initCreateTest(); 
        } catch(e) { 
            alert("Error: " + e.message); 
        } 
    }
    async function postBlog() { 
    const method = editingBlogId ? 'PUT' : 'POST'; 
    const url = editingBlogId ? `/api/admin/blog/${editingBlogId}` : '/api/admin/blog'; 
    await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: document.getElementById('b-title').value, content: document.getElementById('b-content').innerHTML, image: tempImg }) }); 
    alert("Saved!"); 
    tempImg = ""; editingBlogId = null; 
    loadBlogs(); // ADD THIS LINE TO AUTO-REFRESH THE BLOGS
}
    async function postAnnounce() { await fetch('/api/admin/announcement/add', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text: document.getElementById('ann-text').value}) }); showAdm('announce'); loadAnnouncements(); }
    async function delAnnounce(text) { await fetch('/api/admin/announcement/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text}) }); showAdm('announce'); }
    function filterTable(inp) { const filter = inp.value.toUpperCase(); const tr = document.getElementById('adm-res-list').getElementsByTagName('tr'); for (let i=0; i<tr.length; i++) { const txt = tr[i].innerText; tr[i].style.display = txt.toUpperCase().indexOf(filter) > -1 ? "" : "none"; } }
    
    async function loadAnnouncements() { try { const res = await fetch('/api/announcement'); const data = await res.json(); document.getElementById('anno-marquee').innerHTML = (data.list && data.list.length > 0) ? data.list.join(' &nbsp;|&nbsp; ') : "Welcome"; } catch(e) {} }
    
    // -----------------------------------------
// 1. BULLETPROOF BLOGS LOADER
// -----------------------------------------
async function loadBlogs() { 
    const container = document.getElementById('blog-grid');
    if(!container) return;
    
    try {
        const res = await fetch('/api/blogs'); 
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        
        const blogsRaw = await res.json(); 
        allBlogs = Array.isArray(blogsRaw) ? blogsRaw : []; 
        
        if (allBlogs.length === 0) { 
            container.innerHTML = getEmptyStateGame("No Blogs Published Yet"); 
        } else { 
            const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'%3E%3Crect width='300' height='180' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='%2394a3b8'%3E✍️%3C/text%3E%3C/svg%3E";
            container.innerHTML = allBlogs.map(b => `<div class="card blog-card" onclick="viewBlog('${b._id}')"><img src="${b.image || placeholderSvg}" alt="cover" onerror="this.src='${placeholderSvg}'"><div class="blog-content-preview"><h3 class="blog-title">${b.title || 'Untitled'}</h3><small>${b.date ? new Date(b.date).toLocaleDateString() : 'Recent'}</small></div></div>`).join(''); 
        }
    } catch(e) { 
        console.error("Blog Load Error:", e);
        container.innerHTML = `<div style="padding:20px; border:2px dashed #ef4444; color:#ef4444; background:#fef2f2; border-radius:8px; text-align:center;"><b>🚨 Error Loading Blogs:</b> ${e.message}</div>`;
    }
}
//=================================================================================================
    
    let blogPages = []; let currentBPage = 0;
    function viewBlog(id) { 
        const blog = allBlogs.find(b => b._id === id); if(!blog) return; 
        document.getElementById('bm-title').innerText = blog.title; document.getElementById('bm-date').innerText = new Date(blog.date).toLocaleDateString(); 
        blogPages = blog.content.split(/<hr[^>]*>/i); if(blogPages.length === 0) blogPages = [blog.content]; currentBPage = 0;
        document.getElementById('bm-img').style.display = 'none'; 
        renderBlogPage(); openModal('blog-modal'); 
    }
    function renderBlogPage() {
        document.getElementById('bm-content').innerHTML = blogPages[currentBPage] || "";
        document.getElementById('bm-page-info').innerText = `Page ${currentBPage + 1} of ${blogPages.length}`;
        document.getElementById('bm-prev').style.visibility = currentBPage === 0 ? 'hidden' : 'visible';
        document.getElementById('bm-next').style.visibility = currentBPage === blogPages.length - 1 ? 'hidden' : 'visible';
    }
    function changeBlogPage(dir) { currentBPage += dir; renderBlogPage(); document.getElementById('blog-modal').scrollTo(0, 0); }
    

    // 🔄 UPDATE: Cool Premium Badges & Ongoing Test Highlighter
async function loadTests(isLive) { 
    try {
        const res = await fetch('/api/tests'); const tests = await res.json(); const now = new Date(); 
        const filteredTests = tests.filter(t => { const tEnd = t.endTime ? new Date(t.endTime) : null; if (isLive) { return t.isLive && tEnd && tEnd > now; } else { return !t.isLive || (t.isLive && tEnd && tEnd <= now); } }); 
        const container = document.getElementById(isLive?'live-list':'test-list');
        
        // Check if there is an active session running right now
        const session = JSON.parse(localStorage.getItem('arc_test_session'));
        const ongoingTestId = (session && session.endTime > Date.now()) ? session.test._id : null;

        if (filteredTests.length === 0) { container.innerHTML = getEmptyStateGame(`No ${isLive ? 'Live' : 'Practice'} Tests Available`); } 
        else { 
            container.innerHTML = filteredTests.map(t => {
                // Store/Premium check
                const storeItem = dynamicStoreData.find(si => si.type === 'test' && si.link === t._id);
                
                // Holographic Premium Badge
                const premiumBadge = storeItem ? `<div class="premium-badge-cool">💎 PREMIUM <span style="background:white; color:#0f172a; padding:2px 8px; border-radius:12px; margin-left:3px; font-size:0.75rem;">${storeItem.cost} <div class="arc-coin" style="width:1.1em; height:1.1em; vertical-align:-0.2em; margin:0;"></div></span></div>` : '';
                
                // Floating Lock Icon
                const lockIcon = t.accessCode && !storeItem ? '<span class="premium-lock-cool" title="Password Protected">🔒</span>' : ''; 

                // Ongoing Check
                const isOngoing = (t._id === ongoingTestId);
                const cardClass = isOngoing ? "card ongoing-test-card" : "card";
                const ongoingBanner = isOngoing ? `<div class="ongoing-label">ONGOING</div>` : '';
                
                // Change Button if Ongoing
                let btnHtml = "";
                if (isOngoing) {
                    btnHtml = `<button class="btn" style="background:var(--green); color:white; width:100%; font-size:1.1rem; box-shadow:0 4px 15px rgba(34, 197, 94, 0.4);" onclick="startTest('${t._id}', ${(t.accessCode || storeItem) ? true : false}, '${t.startTime}')">Resume Test ➡</button>`;
                } else {
                    btnHtml = `<button class="btn btn-gold" style="width:100%;" onclick="startTest('${t._id}', ${(t.accessCode || storeItem) ? true : false}, '${t.startTime}')">Start</button>`;
                }

                return `<div class="${cardClass}" style="border-left: 5px solid ${isLive ? 'red' : 'gold'}; position:relative; overflow:hidden; display:flex; flex-direction:column;">
                    ${ongoingBanner}
                    ${premiumBadge}
                    <h3 style="display:flex; align-items:center; margin-top:${isOngoing ? '25px' : '0'}; line-height:1.3;">${t.title} ${lockIcon}</h3>
                    <p style="color:#64748b; font-weight:600; margin-top:-5px;">⏱️ ${t.duration} Mins</p>
                    ${isLive ? `<p style="color:var(--red); font-weight:bold;">Start: ${new Date(t.startTime).toLocaleString()}</p>` : ''}
                    <div style="margin-top: auto; padding-top: 15px;">
                        ${btnHtml}
                    </div>
                </div>`;
            }).join(''); 
        }
    } catch(e) { console.error("Could not load tests"); }
}
    
    function startTimer(durationOrTimestamp) { 
        clearInterval(timer); const now = Date.now();
        if (durationOrTimestamp < 1000000) { testEndTime = now + (durationOrTimestamp * 60 * 1000); } else { testEndTime = durationOrTimestamp; }
        saveSession(testEndTime);
        timer = setInterval(() => { 
            const currentNow = Date.now(); const remaining = Math.floor((testEndTime - currentNow) / 1000); 
            if(remaining < 0) { clearInterval(timer); submitTest(true); return; } 
            intervalSec++; const m = Math.floor(remaining / 60); const s = remaining % 60; 
            const td = document.getElementById('mobile-timer');
            if(td) { td.innerText = `${m}:${s < 10 ? '0'+s : s}`; td.style.color = remaining < 60 ? "red" : "inherit"; }
        }, 1000); 
    }

    // 1. UPDATED START TEST FUNCTION
// 1. UPDATED START TEST FUNCTION (Blocks overrides & Instant Loads Premium)
async function startTest(id, hasCode, startTimeStr) {
    // 🛑 ONGOING TEST BLOCKER
    const session = JSON.parse(localStorage.getItem('arc_test_session'));
    if (session && session.endTime > Date.now()) {
        if (session.test._id !== id) {
            alert("⚠️ You have an ongoing test! Please submit it before starting a new one.");
            show('exam'); // Force them back into their running test
            return;
        }
    }

    if (startTimeStr) {
        const now = new Date();
        const start = new Date(startTimeStr);
        if (now < start) {
            document.getElementById('alert-msg').innerText = "Test Locked";
            openModal('alert-modal');
            return;
        }
    }

    // 🛑 SMART PREMIUM BLOCKER
    const storeItem = dynamicStoreData.find(si => si.type === 'test' && si.link === id);
    const isUnlocked = user && user.unlockedItems && user.unlockedItems.includes(id);
    const isAdmin = user && user.role === 'admin';

    if (storeItem && !isUnlocked && !isAdmin) {
        openPremiumAlert(storeItem.cost, 'test');
        return;
    }

    const processStart = async (code) => {
        const res = await fetch('/api/test/start', { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ id, code, studentEmail: user ? user.email : null }) 
        });
        const data = await res.json();
        
        if (data.success) {
            const finalizeStart = () => {
                closeCoolModal();
                currentTest = data.test;
                answers = new Array(currentTest.questions.length).fill(null);
                timeTaken = new Array(currentTest.questions.length).fill(0);
                qIndex = 0;
                startTimer(currentTest.duration);
                show('exam');
                renderQ();
                if(typeof toggleWatermark === 'function') toggleWatermark(true);
            };

            // ⚡ INSTANT LOAD: Only play animation if they ACTUALLY typed a password
            const usedPassword = hasCode && !isUnlocked && !isAdmin;
            if (usedPassword) {
                triggerUnlockSuccessAnimation(finalizeStart);
            } else {
                finalizeStart(); 
            }
        } else {
            if (hasCode) triggerPassError();
            else { alert(data.message || "Access Denied"); }
        }
    };

    const needsPassword = hasCode && !isUnlocked && !isAdmin;
    if (needsPassword) {
        openCoolModal("Unlock Test", "This test is password protected.", processStart);
    } else {
        processStart(""); 
    }
}

// 2. UPDATED OPEN MATERIAL FUNCTION
async function openMat(id) {
    const mat = allMats.find(m => m._id === id);
    if(!mat) return;
    
    // 🛑 SMART PREMIUM BLOCKER
    const storeItem = dynamicStoreData.find(si => si.type === 'pdf' && si.link === id);
    const isUnlocked = user && user.unlockedItems && user.unlockedItems.includes(id);
    const isAdmin = user && user.role === 'admin';

    if (storeItem && !isUnlocked && !isAdmin) {
        openPremiumAlert(storeItem.cost, 'file');
        return;
    }

    const processUnlock = async (code) => {
        const res = await fetch('/api/material/unlock', { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({id, code, studentEmail: user ? user.email : null})
        });
        const data = await res.json();
        
        if (data.success) {
            const finalizeUnlock = () => {
                closeCoolModal();
                openPdfViewer(mat.title, data.link);
            };

            // ⚡ INSTANT LOAD check
            const usedPassword = mat.accessCode && !isUnlocked && !isAdmin;
            if (usedPassword) {
                triggerUnlockSuccessAnimation(finalizeUnlock);
            } else {
                finalizeUnlock();
            }
        } else {
            triggerPassError();
        }
    };

    const needsPassword = mat.accessCode && !isUnlocked && !isAdmin;
    if (needsPassword) {
        openCoolModal("Unlock Library", `Enter password for ${mat.title}`, processUnlock);
    } else {
        processUnlock("");
    }
}

    // --- 🛒 STORE ACTION MODAL LOGIC ---
let storeConfirmCallback = null;

function openStoreAlert(type, title, msg, onConfirm = null) {
    const iconEl = document.getElementById('store-action-icon');
    const titleEl = document.getElementById('store-action-title');
    const msgEl = document.getElementById('store-action-msg');
    const btnsEl = document.getElementById('store-action-btns');
    const contentBox = document.querySelector('#store-action-modal .modal-content');

    titleEl.innerText = title;
    msgEl.innerHTML = msg;
    storeConfirmCallback = onConfirm;

    // Reset styles
    iconEl.style.animation = 'none';
    
    // 1. ERROR STATE (Not enough coins)
    if (type === 'error') {
        iconEl.innerHTML = '❌';
        titleEl.style.color = 'var(--red)';
        contentBox.style.borderColor = 'var(--red)';
        btnsEl.innerHTML = `<button class="btn btn-red" style="flex: 1; font-size:1.1rem;" onclick="closeStoreAlert()">Dismiss</button>`;
        setTimeout(() => { iconEl.style.animation = 'shakeError 0.5s ease-in-out'; }, 50);
    } 
    // 2. SUCCESS STATE (Item bought)
    else if (type === 'success') {
        iconEl.innerHTML = '🎉';
        titleEl.style.color = 'var(--green)';
        contentBox.style.borderColor = 'var(--green)';
        btnsEl.innerHTML = `<button class="btn btn-green" style="flex: 1; background: var(--green); color: white; font-size:1.1rem;" onclick="closeStoreAlert()">Awesome!</button>`;
        setTimeout(() => { iconEl.style.animation = 'lockPopAnim 0.6s forwards'; }, 50);
    } 
    // 3. CONFIRM STATE (Are you sure?)
    else if (type === 'confirm') {
        iconEl.innerHTML = '🤔';
        titleEl.style.color = 'var(--gold)';
        contentBox.style.borderColor = 'var(--gold)';
        btnsEl.innerHTML = `
            <button class="btn" style="flex: 1; background: #334155; color: white; border: 1px solid #475569;" onclick="closeStoreAlert()">Cancel</button>
            <button class="btn btn-gold" style="flex: 1.5; font-size:1.1rem; box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);" onclick="executeStoreConfirm()">Unlock Now</button>
        `;
        setTimeout(() => { iconEl.style.animation = 'floatDiamond 2.5s ease-in-out infinite'; }, 50);
    }

    openModal('store-action-modal');
    setTimeout(() => { contentBox.style.transform = "scale(1)"; }, 10);
}

function closeStoreAlert() {
    document.querySelector('#store-action-modal .modal-content').style.transform = "scale(0.8)";
    setTimeout(() => { closeModal('store-action-modal'); }, 200);
}

function executeStoreConfirm() {
    closeStoreAlert();
    if(storeConfirmCallback) setTimeout(storeConfirmCallback, 250); // Wait for closing animation
}


    function renderQ() { 
        const q = currentTest.questions[qIndex]; document.getElementById('q-no').innerText = `Q${qIndex + 1}`; const m = q.marks || 4; const n = q.negative || 0; document.getElementById('q-marks').innerText = `+${m} / -${n}`; document.getElementById('q-text').innerHTML = q.text; const img = document.getElementById('q-img'); 
        if(q.image) { img.src = q.image; img.style.display = 'block'; } else img.style.display = 'none'; document.getElementById('q-opts').innerHTML = q.options.map((o, i) => `<label class="mcq-label"><input type="radio" name="opt" value="${i}" ${answers[qIndex] === i ? 'checked' : ''}> <div>${o}</div></label>`).join(''); document.getElementById('palette').innerHTML = answers.map((a, i) => `<div class="p-btn ${a !== null ? 'done' : (i === qIndex ? 'active' : '')}" onclick="gotoQ(${i})">${i+1}</div>`).join(''); 
    }
    
    function saveNext() { 
        const sel = document.querySelector('input[name="opt"]:checked'); answers[qIndex] = sel ? parseInt(sel.value) : null; timeTaken[qIndex] = (timeTaken[qIndex] || 0) + intervalSec; intervalSec = 0; saveSession(); 
        const pBtns = document.getElementById('palette').children; if(answers[qIndex] !== null) pBtns[qIndex].classList.add('done');
        if(qIndex < currentTest.questions.length - 1) { qIndex++; renderQ(); } else { alert("This is the last question."); } 
    }

    function clearAns() { answers[qIndex] = null; saveSession(); renderQ(); }
    function gotoQ(i) { timeTaken[qIndex] = (timeTaken[qIndex] || 0) + intervalSec; intervalSec = 0; qIndex = i; renderQ(); }
    async function submitTest(auto = false) { if(!auto && !confirm("Submit?")) return; 
    clearInterval(timer); 
    const res = await fetch('/api/test/submit', 
    { method: 'POST', headers: {'Content-Type':'application/json'}, 
    body: JSON.stringify({ testId: currentTest._id, answers, timeTaken, studentName: user.name, studentEmail: user.email }) });
     const data = await res.json(); if(data.success) { clearSession(); 
        document.getElementById('exam').classList.remove('active'); 
        toggleWatermark(false);
        show('results'); 
        viewSheet(data.resultId); } }
    
    async function viewSheet(id) { 
        const res = await fetch('/api/result-details', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ resultId: id }) }); const data = await res.json(); if(!data.success) return alert(data.message); const r = data.result; let correct = 0, wrong = 0, skipped = 0;
        data.questions.forEach(q => { if(q.status === 'Correct') correct++; else if(q.status === 'Wrong') wrong++; else skipped++; });
        if (r.percentage >= 80) {
            triggerChemicalExplosion();    // 🔥 Trigger the Chemical Explosion if they got 80%
        }
        
        // 🔒 Secure Server-Side Coin Claim
        if (!r.coinsAwarded) {
            try {
                const claimRes = await fetch('/api/claim-test-coins', { 
                    method: 'POST', headers: {'Content-Type':'application/json'}, 
                    body: JSON.stringify({ resultId: id }) 
                });
                const claimData = await claimRes.json();
                
                if (claimData.success && claimData.amount > 0) {
                    setTimeout(() => {
                        updateCoins(claimData.amount, `Scored ${r.percentage.toFixed(1)}% on Practice Test`);
                    }, 2000);
                }
            } catch(e) { console.log("Coin claim error"); }
        }
        
        
        document.getElementById('review-stats').innerHTML = `<span>Score: ${r.score}/${r.totalMarks}</span> | <span>Rank: #${data.rank}</span> | <span>${r.percentage.toFixed(1)}%</span>`; 
        let html = `<div style="display:flex; flex-wrap:wrap; gap:20px; justify-content:center; margin-bottom:30px;"><div style="flex:1; min-width:300px; max-width:400px;"><canvas id="resultChart"></canvas></div><div style="flex:1; min-width:300px; max-height:300px; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:8px;"><h3 style="text-align:center; margin-top:0;">Leaderboard</h3><table style="width:100%; font-size:0.9rem;"><tr style="background:#f1f5f9;"><th>#</th><th>Student</th><th>Score</th></tr>${data.leaderboard.map(rec => `<tr style="${rec.rank === data.rank ? 'background:#e0f2fe; font-weight:bold;' : ''}"><td>#${rec.rank}</td><td>${rec.name}</td><td>${rec.score}</td></tr>`).join('')}</table></div></div><hr><h3>Sheet</h3>`;
        html += data.questions.map((q, i) => `<div class="review-row"><p><strong>Q${i+1}:</strong> ${q.text}</p>${q.image ? `<img src="${q.image}" style="height:100px">` : ''}<div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">${q.options.map((opt, idx) => `<div style="padding:5px; border:1px solid #ddd; ${idx === q.correct ? 'background:#dcfce7; border-color:green;' : ''} ${idx === q.studentAnswer && idx !== q.correct ? 'background:#fee2e2; border-color:red;' : ''}"> ${opt} </div>`).join('')}</div><p style="margin-top:5px; font-size:0.9rem;">Status: <span class="badge ${q.status==='Correct'?'bg-green':'bg-red'}">${q.status}</span></p>${q.solution || q.solutionImage ? `<div style="background:#f0f9ff; padding:10px; margin-top:5px;"><strong>💡 Solution:</strong><br>${q.solution}${q.solutionImage ? `<br><img src="${q.solutionImage}" style="max-height:150px; margin-top:10px;">` : ''}</div>` : ''}</div>`).join('');
        document.getElementById('review-body').innerHTML = html; openModal('review-modal');
        const ctx = document.getElementById('resultChart').getContext('2d'); if(resultChartInstance) resultChartInstance.destroy(); resultChartInstance = new Chart(ctx, { type: 'pie', data: { labels: ['Correct', 'Wrong', 'Skipped'], datasets: [{ data: [correct, wrong, skipped], backgroundColor: ['#22c55e', '#ef4444', '#cbd5e1'] }] } });
    }
    
    async function loadResults(type) { const res = await fetch('/api/student/results/online', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: user.email }) }); const data = await res.json(); document.getElementById('result-list').innerHTML = `<table><tr><th>Date</th><th>Test</th><th>Score</th><th>Action</th></tr>${data.results.filter(r => r.testType === type).map(r => `<tr><td>${new Date(r.date).toLocaleDateString()}</td><td>${r.testTitle}</td><td>${r.score}</td><td><button class="btn btn-gold btn-small" onclick="viewSheet('${r._id}')">View</button></td></tr>`).join('')}</table>`; }
    
    async function loadOfflineResults() { 
        try {
            const res = await fetch('/api/results/offline'); const data = await res.json(); 
            if (data.length === 0) { document.getElementById('result-list').innerHTML = getEmptyStateGame("No Offline Results Uploaded"); } 
            else { document.getElementById('result-list').innerHTML = data.map(r => `<h3>${r.title}</h3><table><tr><th>Rank</th><th>Student</th><th>Marks</th><th>Sheet</th></tr>${r.records.map(rec => `<tr><td>#${rec.rank}</td><td>${rec.studentName}</td><td>${rec.obtainedMarks}</td><td>${rec.copyLink ? `<a href="${rec.copyLink}" target="_blank" style="color:blue">View</a>` : '-'}</td></tr>`).join('')}</table>`).join(''); }
        } catch(e) { console.error(e); }
    }
    
    async function loadMaterials() { 
        try { 
            const res = await fetch('/api/materials'); 
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            const data = await res.json(); 
            allMats = Array.isArray(data) ? data : [];
        } catch(e) { 
            console.error("Materials Load Error:", e);
            allMats = [];
        } 
    }
    async function loadLib(cat) { 
        document.getElementById('lib-cats').style.display = 'none'; 
        document.getElementById('lib-back').style.display = 'block'; 
        // Re-fetch if allMats is empty (e.g., initial load failed or not yet complete)
        if (!allMats || allMats.length === 0) await loadMaterials();
        renderLib(cat); 
    }
    
    // 🔄 UPDATE: Cool Premium Badges for Library Files
// 2. BULLETPROOF LIBRARY RENDERER
// -----------------------------------------
function renderLib(cat) { 
    const container = document.getElementById('lib-content');
    if(!container) return;

    try {
        // Safe filtering: Checks if category exists BEFORE checking what's inside it
        const items = allMats.filter(m => {
            if (!m.category) return false; 
            return m.category === cat || (cat.includes('11') && m.category.includes('11'));
        });

        if (items.length === 0) { 
            container.innerHTML = getEmptyStateGame(`No items available in ${cat}`); 
        } else { 
            container.innerHTML = items.map(m => {
                // Safe check for the Premium Store
                const storeItem = (typeof dynamicStoreData !== 'undefined' && dynamicStoreData) 
                    ? dynamicStoreData.find(si => si.type === 'pdf' && si.link === m._id) 
                    : null;
                    
                const premiumBadge = storeItem ? `<div style="position:absolute; top:10px; right:10px; background:var(--gold); color:var(--primary); padding:5px; border-radius:4px; font-weight:bold; font-size:0.8rem; box-shadow:0 2px 5px rgba(0,0,0,0.3);">💎 Premium (${storeItem.cost} 🪙)</div>` : '';
                const lockIcon = m.accessCode && !storeItem ? '🔒' : '';

                return `<div class="card" style="position:relative;">
                    ${premiumBadge}
                    <img src="${m.image||''}" style="height:180px; width: 100%; background:#f8fafc; object-fit:contain; border-radius: 8px; border: 1px solid #eee;" onerror="this.style.display='none'">
                    <h4 style="margin: 15px 0 10px 0;">${m.title || 'Untitled'} ${lockIcon}</h4>
                    <button class="btn btn-gold" onclick="openMat('${m._id}')">Open File</button>
                </div>`;
            }).join(''); 
        }
    } catch (e) {
        console.error("Library Render Error:", e);
        container.innerHTML = `<div style="padding:20px; border:2px dashed #ef4444; color:#ef4444; background:#fef2f2; border-radius:8px; text-align:center;"><b>🚨 Error Loading Library:</b> ${e.message}</div>`;
    }
}
    
    function resetLib() { document.getElementById('lib-cats').style.display = 'grid'; document.getElementById('lib-back').style.display = 'none'; document.getElementById('lib-content').innerHTML = ''; }
    
    function renderCreatePalette() { const p = document.getElementById('create-palette'); if(!p) return; p.innerHTML = draftQ.map((q, i) => `<div class="q-btn ${i === editQIndex ? 'active' : ''}" onclick="loadDraftQ(${i})">${i+1}</div>`).join('') + `<div class="q-btn" onclick="clearQForm()" style="color:green; font-size:1.2rem;">+</div>`; document.getElementById('q-count').innerText = draftQ.length; }
    
    function saveDraftQ() { const qData = { text: document.getElementById('q-editor').innerHTML, topic: document.getElementById('q-topic').value, options: [0,1,2,3].map(i => document.getElementById('op'+i).innerHTML), correct: parseInt(document.getElementById('q-corr').value), marks: parseFloat(document.getElementById('q-marks').value) || 4, negative: parseFloat(document.getElementById('q-neg').value) || 0, solution: document.getElementById('q-sol').innerHTML, image: tempImg, solutionImage: tempSolImg }; if(editQIndex > -1) { if(!qData.image) qData.image = draftQ[editQIndex].image; if(!qData.solutionImage) qData.solutionImage = draftQ[editQIndex].solutionImage; draftQ[editQIndex] = qData; } else { draftQ.push(qData); } clearQForm(); }
    
    function loadDraftQ(index) { editQIndex = index; const q = draftQ[index]; document.getElementById('q-editor').innerHTML = q.text; document.getElementById('q-topic').value = q.topic || ""; [0,1,2,3].forEach(i => document.getElementById('op'+i).innerHTML = q.options[i]); document.getElementById('q-corr').value = q.correct; document.getElementById('q-marks').value = q.marks !== undefined ? q.marks : 4; document.getElementById('q-neg').value = q.negative !== undefined ? q.negative : 0; document.getElementById('q-sol').innerHTML = q.solution || ""; if(q.image) { document.getElementById('q-prev').src = q.image; document.getElementById('q-prev').style.display = 'block'; tempImg = q.image; } else { document.getElementById('q-prev').style.display = 'none'; tempImg = ""; } if(q.solutionImage) { document.getElementById('sol-prev').src = q.solutionImage; document.getElementById('sol-prev').style.display = 'block'; tempSolImg = q.solutionImage; } else { document.getElementById('sol-prev').style.display = 'none'; tempSolImg = ""; } renderCreatePalette(); }
    function clearQForm() { editQIndex = -1; document.getElementById('q-editor').innerHTML = ""; document.getElementById('q-topic').value = ""; [0,1,2,3].forEach(i => document.getElementById('op'+i).innerHTML = ""); document.getElementById('q-sol').innerHTML = ""; document.getElementById('q-marks').value = "4"; document.getElementById('q-neg').value = "0"; document.getElementById('q-prev').style.display = 'none'; tempImg = ""; document.getElementById('sol-prev').style.display = 'none'; tempSolImg = ""; document.getElementById('q-sol-file').value = ""; renderCreatePalette(); }

    let editingScheduleId = null;

async function loadStories() {
    const bookContainer = document.getElementById('story-book');
    if(!bookContainer) return;

    try {
        const res = await fetch('/api/stories');
        
        // Check if the backend sent an error page (like a 404 or 500) instead of data
        if (!res.ok) throw new Error(`Server returned status: ${res.status}`);
        
        const dataRaw = await res.json(); 
        const data = Array.isArray(dataRaw) ? dataRaw : [];

        // --- EMPTY STATE ---
        if (data.length === 0) {
            bookContainer.innerHTML = `
            <div class="book-sheet flipped" style="z-index: 2;">
                <div class="page-face page-front" style="background: var(--primary); color: white; justify-content: center; align-items: center; text-align: center;">
                    <div class="content-wrapper">
                        <h2 style="font-size: 2.5rem; margin:0 0 10px 0; color: var(--gold);">HALL OF FAME</h2>
                        <p style="font-size: 1.1rem; opacity: 0.8; text-transform:uppercase;">ARC CLASSES SUCCESS STORIES</p>
                        <div style="font-size: 5rem; margin-top: 30px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.3));">🏆</div>
                    </div>
                </div>
                <div class="page-face page-back" style="justify-content: center; align-items: center; text-align: center; background: #f8fafc;">
                    <div class="content-wrapper" style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%;">
                        <div style="font-size: 4rem; margin-bottom: 20px;">🌟</div>
                        <h3 style="color:var(--primary); margin:0;">No Stories Yet!</h3>
                        <p style="color:#666; font-size: 1.1rem;">Be the first student to make it to the Hall of Fame.</p>
                    </div>
                </div>
            </div>
            <div class="book-sheet" style="z-index: 1;">
                <div class="page-face page-front" style="justify-content: center; align-items: center; text-align: center; background: white;">
                    <div class="content-wrapper" style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%;">
                        <p style="color:#444; font-size: 1.1rem; max-width: 80%; line-height: 1.5;">Your success story will inspire the next batch of students.</p>
                        <button class="btn btn-gold" style="margin-top: 20px; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(251,191,36,0.3);" onclick="openModal('story-modal')">✍️ Add Your Story</button>
                    </div>
                </div>
                <div class="page-face page-back" style="background: var(--primary);"></div>
            </div>`;
            if(window.bookInterval) clearInterval(window.bookInterval);
            return;
        }

        let html = '';
        
        // --- 1. Create the Cover Sheet ---
        const firstStory = data[0];
        const firstFallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstStory?.name || 'Student')}&background=0f172a&color=fbbf24&bold=true&size=180`;
        html += `
        <div class="book-sheet" style="z-index: ${data.length + 1}">
            <div class="page-face page-front" style="background: var(--primary); color: white; justify-content: center; align-items: center; text-align: center;">
                <div class="content-wrapper">
                    <h2 style="font-size: 2.5rem; margin:0 0 10px 0; color: var(--gold);">HALL OF FAME</h2>
                    <p style="font-size: 1.1rem; opacity: 0.8; text-transform:uppercase;">ARC CLASSES SUCCESS STORIES</p>
                    <div style="font-size: 5rem; margin-top: 30px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.3));">🏆</div>
                </div>
            </div>
            <div class="page-face page-back">
                <div class="content-wrapper">
                    <span class="photo-label">SUCCESS STORY #1</span>
                    <img src="${firstStory.image || firstFallbackImg}" class="book-photo-large" onerror="this.onerror=null; this.src='${firstFallbackImg}';">
                </div>
            </div>
        </div>`;

        // --- 2. Create Content Sheets ---
        for (let i = 0; i < data.length - 1; i++) {
            const currentStoryText = data[i];
            const nextStoryPhoto = data[i+1];
            const fallbackImgNext = `https://ui-avatars.com/api/?name=${encodeURIComponent(nextStoryPhoto?.name || 'Student')}&background=0f172a&color=fbbf24&bold=true&size=180`;
            const zIndexRight = data.length - i; 

            html += `
            <div class="book-sheet" style="z-index: ${zIndexRight}">
                <div class="page-face page-front">
                    <span class="book-quote-icon">“</span>
                    <div class="content-wrapper">
                        <p class="book-experience">${currentStoryText.experience}</p>
                        <div class="student-details">
                            <p class="book-name">${currentStoryText.name}</p>
                            <p class="book-status">${currentStoryText.status || ''}</p>
                            ${(typeof user !== 'undefined' && user && user.role === 'admin') ? `<button class="btn btn-red btn-small" onclick="deleteItem('story', '${currentStoryText._id}')" style="margin-top: 10px; align-self: flex-end;">Delete</button>` : ''}
                        </div>
                    </div>
                </div>
                <div class="page-face page-back">
                    <div class="content-wrapper">
                        <span class="photo-label">SUCCESS STORY #${i+2}</span>
                        <img src="${nextStoryPhoto.image || fallbackImgNext}" class="book-photo-large" onerror="this.onerror=null; this.src='${fallbackImgNext}';">
                    </div>
                </div>
            </div>`;
        }

        // --- 3. Create Last Sheet ---
        const lastStoryText = data[data.length - 1];
        
        html += `
        <div class="book-sheet" style="z-index: 1">
            <div class="page-face page-front">
                <span class="book-quote-icon">“</span>
                <div class="content-wrapper">
                    <p class="book-experience">${lastStoryText.experience}</p>
                    <div class="student-details">
                        <p class="book-name">${lastStoryText.name}</p>
                        <p class="book-status">${lastStoryText.status || ''}</p>
                        ${(typeof user !== 'undefined' && user && user.role === 'admin') ? `<button class="btn btn-red btn-small" onclick="deleteItem('story', '${lastStoryText._id}')" style="margin-top: 10px; align-self: flex-end;">Delete</button>` : ''}
                    </div>
                </div>
            </div>
            <div class="page-face page-back" style="background: var(--primary); justify-content: center; align-items: center; text-align: center;">
                <div class="content-wrapper" style="opacity: 0.1; font-size: 8rem; justify-content: center; align-items: center;">⭐</div>
            </div>
        </div>`;

        bookContainer.innerHTML = html;

        // --- 4. Animation and Pause-on-Hover Logic ---
        // BUG FIX: Ensure we only select sheets inside the book container to prevent scope issues!
        const sheets = bookContainer.querySelectorAll('.book-sheet');
        let currentSheetIdx = 0;
        let isPaused = false;
        const totalSheets = sheets.length;

        if(window.bookInterval) clearInterval(window.bookInterval);

        const flipNext = () => {
            if (isPaused) return;
            if (currentSheetIdx < totalSheets) {
                sheets[currentSheetIdx].classList.add('flipped');
                const flipDuration = 1800; 
                setTimeout((idx) => { 
                    if(sheets[idx]) sheets[idx].style.zIndex = idx + 1; 
                }, flipDuration * 0.45, currentSheetIdx); 
                currentSheetIdx++;
            } else {
                currentSheetIdx = 0;
                sheets.forEach((s, i) => {
                    s.classList.remove('flipped');
                    setTimeout((sheet, idx) => { sheet.style.zIndex = totalSheets - idx + 1; }, i * 30, s, i);
                });
            }
        };

        setTimeout(() => {
            if(currentSheetIdx === 0 && !isPaused) flipNext();
        }, 1000);

        window.bookInterval = setInterval(flipNext, 4000); 

        const interactionArea = document.getElementById('book-shadow-container');
        if(interactionArea) {
            interactionArea.onmouseenter = () => { isPaused = true; };
            interactionArea.onmouseleave = () => { isPaused = false; };
        }
    } catch(e) { 
        console.error("Error loading Hall of Fame:", e); 
        // BUG FIX: Stop swallowing the error. Print it on the screen so we can see why it failed!
        bookContainer.innerHTML = `
        <div style="text-align:center; padding: 40px; color: var(--red); background: #fef2f2; border: 1px dashed #f87171; border-radius: 8px; position:relative; z-index:10;">
            <h3>🚨 Connection Error</h3>
            <p style="color: #444;">Could not load the Hall of Fame.</p>
            <p style="font-family: monospace; font-size: 0.9rem;">${e.message}</p>
        </div>`;
    }
}

    async function submitStory() {
        const body = { name: document.getElementById('st-name').value, status: document.getElementById('st-status').value, experience: document.getElementById('st-exp').value, image: tempImg };
        if(!body.name || !body.experience) return alert("Please fill Name and Experience.");
        const res = await fetch('/api/story', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }); const data = await res.json();
        if(data.success) { alert("Story Submitted!"); closeModal('story-modal'); tempImg = ""; loadStories(); } else { alert("Error"); }
    }

    async function loadVideosList() {
        try {
            const res = await fetch('/api/videos'); const data = await res.json();
            if (data.length === 0) { document.getElementById('video-list').innerHTML = getEmptyStateGame("No Video Lectures Added"); } 
            else { document.getElementById('video-list').innerHTML = data.map(v => `<div class="card"><div class="video-wrapper"><iframe src="${v.link}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><h4 style="margin: 10px 0 5px 0;">${v.title}</h4><small style="color:var(--gold); font-weight:bold;">${v.category}</small></div>`).join(''); }
        } catch(e) { console.error(e); }
    }

    async function uploadVideo() {
        const body = { title: document.getElementById('v-title').value, link: document.getElementById('v-link').value, category: document.getElementById('v-cat').value };
        await fetch('/api/admin/video', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); alert("Video Added!"); showAdm('video'); loadVideosList();
    }

    async function submitDoubt() {
        if(!user) return alert("Please login first.");
        const text = document.getElementById('d-text').value;
        if(!text) return alert("Type your doubt!");
        await fetch('/api/doubt', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ studentEmail: user.email, studentName: user.name, text, image: tempImg }) });
        alert("Doubt sent! Teacher will review it soon."); closeModal('ask-doubt-modal'); tempImg = ""; loadStudentDoubts();
    }

    async function loadStudentDoubts() {
        if(!user) return;
        const res = await fetch('/api/student/doubts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: user.email }) });
        const data = await res.json();
        if (data.length === 0) { document.getElementById('doubt-student-list').innerHTML = getEmptyStateGame("You haven't asked any doubts yet."); } 
        else {
            document.getElementById('doubt-student-list').innerHTML = data.map(db => `<div class="card doubt-card ${db.status === 'Answered' ? 'answered' : ''}"><div style="display:flex; justify-content:space-between;"><b>My Doubt:</b> <span class="badge ${db.status === 'Answered' ? 'bg-green' : 'bg-red'}">${db.status}</span></div><p>${db.text}</p>${db.image ? (db.image.startsWith('data:application/pdf') ? `<div style="margin-top:10px;"><button class="btn btn-gold btn-small" onclick="openPdfViewer('Attached PDF', '${db.image}')">📄 View PDF Attachment</button></div>` : `<img src="${db.image}" style="height:100px; border:1px solid #ccc; cursor:pointer; margin-top:10px;" onclick="openPdfViewer('Image Attachment', '${db.image}')" title="Click to enlarge">`) : ''}<hr>${db.status === 'Answered' ? `<div style="background:#f0f9ff; padding:10px; margin-top:10px; border-radius:6px;"><b>Teacher's Reply:</b><br>${db.replyText} ${db.replyImage ? `<br><img src="${db.replyImage}" style="height:100px; margin-top:5px;">` : ''}</div>` : ''}</div>`).join('');
        }
    }

    async function replyDoubt(id) {
        const rText = document.getElementById(`reply-text-${id}`).value; const rImg = document.getElementById(`reply-img-${id}`).src; const finalImg = rImg.includes('data:image') ? rImg : "";
        await fetch(`/api/admin/doubt/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ replyText: rText, replyImage: finalImg }) });
        alert("Reply Sent!"); showAdm('doubts');
    }

    let currentPOTD = null;
    async function loadPOTD() {
        try {
            const res = await fetch('/api/potd/today'); const data = await res.json();
            if(data.success) {
                currentPOTD = data.potd; document.getElementById('potd-container').style.display = 'block';
                document.getElementById('potd-content').innerHTML = currentPOTD.text + (currentPOTD.image ? `<br><img src="${currentPOTD.image}" style="max-height:150px; margin-top:10px; border-radius:8px;">` : '');
                document.getElementById('potd-opts').innerHTML = currentPOTD.options.map((opt, i) => `<button class="btn" style="background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.3); text-align:left;" onclick="checkPOTD(${i})">${opt}</button>`).join('');
            }
        } catch(e) { console.error(e); }
    }

    function checkPOTD(sel) {
        const resDiv = document.getElementById('potd-result'); resDiv.style.display = 'block';
        if(sel === currentPOTD.correct) { resDiv.innerHTML = `✅ Correct!<br><br><b>Solution:</b><br>${currentPOTD.solution} ${currentPOTD.solutionImage ? `<br><img src="${currentPOTD.solutionImage}" style="max-height:100px; margin-top:5px;">` : ''}`; resDiv.style.background = 'rgba(34, 197, 94, 0.2)'; } 
        else { resDiv.innerHTML = `❌ Incorrect. Try again or check later!`; resDiv.style.background = 'rgba(239, 68, 68, 0.2)'; }
    }

    async function uploadPOTD() {
        const body = { dateStr: document.getElementById('potd-date').value, text: document.getElementById('potd-text').innerHTML, image: tempImg, options: [0,1,2,3].map(i => document.getElementById('po'+i).value), correct: parseInt(document.getElementById('potd-corr').value), solution: document.getElementById('potd-sol').innerHTML, solutionImage: tempSolImg };
        await fetch('/api/admin/potd', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }); alert("POTD Set/Updated!"); tempImg = ""; tempSolImg = ""; showAdm('potd');
    }

    // --- MECHANISM ADMIN FUNCTIONS ---

function addMechStepToDraft() {
    const title = document.getElementById('mech-step-title').value;
    const text = document.getElementById('mech-step-text').value;
    const visual = tempImg; // Grab the Base64 image encoded by your existing function

    if(!title || !text || !visual) return alert("Please fill step title, text, and upload an image/SVG.");

    // Push to draft array
    window.mechDraftSteps.push({ title, text, visual });
    
    // Clear inputs for the next step
    document.getElementById('mech-step-title').value = "";
    document.getElementById('mech-step-text').value = "";
    document.getElementById('mech-step-img').style.display = "none";
    document.getElementById('mech-step-img').src = "";
    tempImg = ""; // Reset global temp image

    // Update draft preview UI
    renderMechDraft();
}

function renderMechDraft() {
    document.getElementById('mech-draft-steps').innerHTML = window.mechDraftSteps.map((s, i) => 
        `<div style="padding: 10px; background: white; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px; display:flex; justify-content:space-between; align-items: center;">
            <div>
                <strong>Step ${i+1}:</strong> ${s.title}<br>
                <small style="color: #666;">${s.text.substring(0, 50)}...</small>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${s.visual}" style="height: 40px; background: #f8fafc; border: 1px solid #ccc; border-radius: 4px;">
                <button class="btn-small btn-red" onclick="window.mechDraftSteps.splice(${i}, 1); renderMechDraft();">X</button>
            </div>
        </div>`
    ).join('');
}

async function uploadMechanism() {
    const mechId = document.getElementById('mech-id').value.toLowerCase().replace(/\s+/g, '');
    const title = document.getElementById('mech-title').value;
    const desc = document.getElementById('mech-desc').value;

    if(!mechId || !title || window.mechDraftSteps.length === 0) {
        return alert("Please fill ID, Title, and add at least one step!");
    }

    const body = { id: mechId, title: title, desc: desc, steps: window.mechDraftSteps };

    // Send to backend
    try {
        await fetch('/api/admin/mechanism', { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify(body) 
        });
        alert("Mechanism Saved!");
        showAdm('mech'); // Refresh panel
    } catch(e) {
        alert("Error saving mechanism.");
    }
}

async function loadAdminMechList() {
    try {
        const res = await fetch('/api/mechanisms');
        const data = await res.json();
        
        if (data.length === 0) {
            document.getElementById('admin-mech-list').innerHTML = "<p>No mechanisms uploaded yet.</p>";
            return;
        }

        document.getElementById('admin-mech-list').innerHTML = `<table><tr><th>ID</th><th>Title</th><th>Steps</th><th>Action</th></tr>` + 
        data.map(m => `<tr>
            <td>${m.id}</td>
            <td>${m.title}</td>
            <td>${m.steps.length}</td>
            <td><button class="btn-red btn-small" onclick="deleteItem('mechanism', '${m._id}')">Del</button></td>
        </tr>`).join('') + `</table>`;
    } catch(e) {
        document.getElementById('admin-mech-list').innerHTML = "Could not load mechanisms.";
    }
}

    function editPOTD(index) {
        if(!window.allPOTDs || !window.allPOTDs[index]) return; const p = window.allPOTDs[index]; document.getElementById('potd-date').value = p.dateStr; document.getElementById('potd-text').innerHTML = p.text;
        if(p.image) { document.getElementById('potd-img').src = p.image; document.getElementById('potd-img').style.display = 'inline-block'; tempImg = p.image; } else { document.getElementById('potd-img').style.display = 'none'; tempImg = ""; }
        for(let i=0; i<4; i++) document.getElementById('po'+i).value = p.options[i] || ""; document.getElementById('potd-corr').value = p.correct; document.getElementById('potd-sol').innerHTML = p.solution || "";
        if(p.solutionImage) { document.getElementById('potd-sol-img').src = p.solutionImage; document.getElementById('potd-sol-img').style.display = 'inline-block'; tempSolImg = p.solutionImage; } else { document.getElementById('potd-sol-img').style.display = 'none'; tempSolImg = ""; } window.scrollTo(0, 0); 
    }

    async function loadAnalytics() {
        if(!user) return alert("Please Login!");
        const res = await fetch('/api/student/analytics', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: user.email }) }); const data = await res.json();
        if(!data.success) return alert("Error loading analytics");
        const topics = Object.keys(data.stats);
        if(topics.length === 0) return alert("Take some tests first to generate your analytics!");
        const accuracyData = topics.map(t => { const stat = data.stats[t]; let pct = stat.total > 0 ? ((stat.obtained / stat.total) * 100) : 0; if (pct < 0) pct = 0; return pct.toFixed(1); });
        openModal('analytics-modal');
        const ctx = document.getElementById('topicRadarChart').getContext('2d'); if(topicRadarInstance) topicRadarInstance.destroy();
        topicRadarInstance = new Chart(ctx, { type: 'bar', data: { labels: topics, datasets: [{ label: 'Score Percentage (%)', data: accuracyData, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderColor: 'rgba(37, 99, 235, 1)', borderWidth: 1, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score Percentage (%)' } }, x: { title: { display: true, text: 'Tests Given' } } }, plugins: { legend: { display: false } } } });
        let weakestTopic = "", minAcc = 101;
        topics.forEach((t, i) => { let acc = parseFloat(accuracyData[i]); if(acc < minAcc && data.stats[t].total > 0) { minAcc = acc; weakestTopic = t; } });
        const adviceDiv = document.getElementById('analytics-advice');
        if(weakestTopic) { adviceDiv.innerHTML = `📉 Based on your history, your weakest test performance is <b>${weakestTopic}</b> (Score: ${minAcc}%). We strongly recommend revising this section!`; } else { adviceDiv.innerHTML = `📈 Great job! Keep giving tests so we can build a stronger profile of your weak areas.`; }
    }

    let allRefTools = [];
    async function loadRefToolsStudent() {
        try {
            const res = await fetch('/api/reftools'); allRefTools = await res.json(); const btnContainer = document.getElementById('ref-btn-container');
            if(btnContainer) {
                if(allRefTools.length > 0) { btnContainer.innerHTML = allRefTools.map((rt, i) => `<button class="btn ${i===0?'btn-red':'btn-gold'} btn-small ref-btn-dynamic" onclick="showRefImg(${i}, this)">${rt.title}</button>`).join(''); showRefImg(0, btnContainer.firstChild); } 
                else { document.getElementById('ref-img-display').innerHTML = getEmptyStateGame("No Reference Tools Uploaded"); }
            }
        } catch(e) { console.error(e); }
    }

    function showRefImg(idx, btnElem) {
        document.querySelectorAll('.ref-btn-dynamic').forEach(b => { b.classList.remove('btn-red'); b.classList.add('btn-gold'); });
        if(btnElem) { btnElem.classList.remove('btn-gold'); btnElem.classList.add('btn-red'); }
        const rt = allRefTools[idx]; document.getElementById('ref-img-display').innerHTML = `<img src="${rt.image}" style="max-width:100%; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.5);">`;
    }

    async function uploadRefTool() {
        if(!tempImg) return alert("Please upload an image first!"); const title = document.getElementById('rt-title').value; if(!title) return alert("Please provide a title!");
        const body = { title: title, image: tempImg }; await fetch('/api/admin/reftool', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); alert("Reference Tool Added Successfully!"); tempImg = ""; showAdm('reftool'); loadRefToolsStudent(); 
    }

     function editDoubtReply(id) {
        const db = window.adminDoubts.find(d => d._id === id); if(!db) return;
        const container = document.getElementById(`doubt-ans-container-${id}`);
        container.innerHTML = `<textarea id="reply-text-${id}" style="width:100%; padding:8px; border-radius:6px; margin-bottom:10px;">${db.replyText}</textarea><input type="file" onchange="encodeImg(this, 'reply-img-${id}')" style="margin:5px 0;"><img id="reply-img-${id}" src="${db.replyImage || ''}" style="height:80px; display:${db.replyImage ? 'block' : 'none'}; border:1px solid #ccc;"><br><button class="btn btn-gold btn-small" style="margin-top:5px;" onclick="replyDoubt('${id}')">Update Reply</button> <button class="btn btn-red btn-small" style="margin-top:5px;" onclick="showAdm('doubts')">Cancel</button>`;
    }

    // 💡 LAMP PULL-STRING INTERACTION JS
    const pullStringBtn = document.getElementById('pull-string-btn'); const stringLineEl = document.getElementById('string-line-el'); let isDraggingString = false; let stringStartY = 0;
    if (pullStringBtn) { pullStringBtn.addEventListener('mousedown', startPull); pullStringBtn.addEventListener('touchstart', startPull, {passive: false}); }
    function startPull(e) { isDraggingString = true; stringStartY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY; stringLineEl.style.transition = 'none'; document.addEventListener('mousemove', pullMove); document.addEventListener('touchmove', pullMove, {passive: false}); document.addEventListener('mouseup', endPull); document.addEventListener('touchend', endPull); }
    function pullMove(e) { if (!isDraggingString) return; e.preventDefault(); let currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY; let deltaY = currentY - stringStartY; if (deltaY < 0) deltaY = 0; if (deltaY > 60) deltaY = 60; stringLineEl.style.height = (120 + deltaY) + 'px'; }
    function endPull(e) { if (!isDraggingString) return; isDraggingString = false; document.removeEventListener('mousemove', pullMove); document.removeEventListener('touchmove', pullMove); document.removeEventListener('mouseup', endPull); document.removeEventListener('touchend', endPull); let currentHeight = parseInt(stringLineEl.style.height || 120); stringLineEl.style.transition = 'height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; stringLineEl.style.height = '120px'; if (currentHeight > 140) { toggleLampString(); } }
    function toggleLampString() { const desk = document.getElementById('deskScene'); desk.classList.toggle('is-on'); }
    function showRegBoxFromLamp() { document.querySelector('.paper-form-container').style.display='none'; document.getElementById('reg-link-container').style.display='none'; document.getElementById('reg-box').style.display='block'; }
    function hideRegBoxFromLamp() { document.getElementById('reg-box').style.display='none'; document.querySelector('.paper-form-container').style.display='block'; document.getElementById('reg-link-container').style.display='block'; }

    // FEATURE: SMART UNIVERSAL DOCUMENT VIEWER
    function openPdfViewer(title, link) {
        let finalLink = link;
        const lowerLink = link.toLowerCase();

        // 1. Define what is "safe" to embed inside your website's iframe
        const isBase64 = link.startsWith('data:'); 
        const isGoogleDrive = lowerLink.includes('drive.google.com');
        const isOneDrive = lowerLink.includes('onedrive.live.com') || lowerLink.includes('1drv.ms') || lowerLink.includes('sharepoint.com');
        const isDirectPdf = lowerLink.endsWith('.pdf');
        const isDirectImage = lowerLink.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;

        // 2. Check if the link is safe to open in the modal
        if (isBase64 || isGoogleDrive || isOneDrive || isDirectPdf || isDirectImage) {
            document.getElementById('pdf-title').innerText = title || "Document Viewer";
            // Format Google Drive links for embedding
            if (isGoogleDrive && lowerLink.includes('/view')) {
                finalLink = link.replace(/\/view.*$/, '/preview');
            } 
            // Format direct external PDFs using Google Docs Viewer for better mobile support
            else if (isDirectPdf && !isBase64) {
                finalLink = `https://docs.google.com/gview?url=${encodeURIComponent(link)}&embedded=true`;
            }
            // Open in the modal
            document.getElementById('pdf-frame').src = finalLink;
            toggleWatermark(true);
            openModal('pdf-modal');
            // 💾 SAVE PDF STATE FOR REFRESH
            localStorage.setItem('arc_open_pdf', JSON.stringify({ title: title, link: link }));
        } else {
            // 3. If it's an external website (like NCERT), open it in a new tab
            window.open(link, '_blank');
        }
    }

let coolModalCallback = null; // Stores what to do after password entry

function openCoolModal(title, msg, callback) {
    // 1. Reset UI from any previous animations
    document.getElementById('cp-icon').innerHTML = "🔒";
    document.getElementById('cp-title').innerText = title;
    document.getElementById('cp-title').style.color = "var(--primary)";
    document.getElementById('cp-msg').innerHTML = msg;
    
    const input = document.getElementById('cp-input');
    input.value = "";
    input.style.display = "block";
    
    document.getElementById('cp-error').style.display = "none";
    document.getElementById('cp-btn-group').style.display = "flex";
    
    coolModalCallback = callback;
    openModal('coolPassModal');
    setTimeout(() => { document.querySelector('#coolPassModal .modal-content').style.transform = "scale(1)"; }, 10);
}

function closeCoolModal() {
    document.querySelector('#coolPassModal .modal-content').style.transform = "scale(0.8)";
    setTimeout(() => { closeModal('coolPassModal'); }, 200);
}

// --- PREMIUM ALERT MODAL LOGIC ---
function openPremiumAlert(cost, type) {
    const msgEl = document.getElementById('premium-alert-msg');
    const typeText = type === 'test' ? 'Test' : 'File';
    msgEl.innerHTML = `This is a <b>Premium ${typeText}</b>.<br>Unlock it for <b style="color:var(--gold); font-size: 1.2rem;">${cost} 🪙</b> in the ARC Store to get lifetime access.`;
    
    openModal('premium-alert-modal');
    // Pop-in bounce animation
    setTimeout(() => { document.querySelector('#premium-alert-modal .modal-content').style.transform = "scale(1)"; }, 10);
}

function closePremiumAlert() {
    document.querySelector('#premium-alert-modal .modal-content').style.transform = "scale(0.8)";
    setTimeout(() => { closeModal('premium-alert-modal'); }, 200);
}

function goToStoreFromAlert() {
    closePremiumAlert();
    setTimeout(() => { show('store'); }, 250); // Small delay to let modal close gracefully
}

function submitCoolPass() {
    const pass = document.getElementById('cp-input').value;
    if (coolModalCallback) coolModalCallback(pass);
}

// 🎬 THE NEW UNLOCK ANIMATION SEQUENCE
function triggerUnlockSuccessAnimation(onComplete) {
    // 1. Hide inputs and errors
    document.getElementById('cp-input').style.display = 'none';
    document.getElementById('cp-btn-group').style.display = 'none';
    document.getElementById('cp-error').style.display = 'none';
    
    // 2. Update Text
    document.getElementById('cp-title').innerText = "Authenticating...";
    document.getElementById('cp-msg').innerText = "Verifying security key...";

    // 3. Set up Animation Scene
    const iconDiv = document.getElementById('cp-icon');
    iconDiv.innerHTML = `
        <div class="lock-scene">
            <div id="anim-lock-emoji" class="anim-lock">🔒</div>
            <div id="anim-key-emoji" class="anim-key">🗝️</div>
        </div>
    `;

    const lock = document.getElementById('anim-lock-emoji');
    const key = document.getElementById('anim-key-emoji');

    // Sequence 1: Key Slides In
    setTimeout(() => { key.classList.add('key-insert'); }, 100);

    // Sequence 2: Key Turns
    setTimeout(() => {
        key.style.transform = "translateX(-35px)"; // lock position to prevent jumping
        key.classList.add('key-turn');
    }, 600);

    // Sequence 3: Lock Pops Open & Text Turns Green
    setTimeout(() => {
        lock.innerText = "🔓";
        lock.classList.add('lock-pop');
        key.style.display = "none"; // Hide key inside lock
        
        document.getElementById('cp-title').innerText = "Access Granted!";
        document.getElementById('cp-title').style.color = "var(--green)";
        document.getElementById('cp-msg').innerHTML = "<b style='color:var(--green); font-size: 1.1rem;'>✅ File Unlocked.</b><br>Opening now...";
    }, 1000);

    // Sequence 4: Finish and trigger the actual PDF/Test open
    setTimeout(() => {
        onComplete();
    }, 2200);
}

// --- 🧬 3D MOLECULE VIEWER LOGIC ---
let viewer3D = null;

function open3DViewer() {
    openModal('mol-modal');
    
    // Initialize the viewer only once to save memory
    if (!viewer3D) {
        let element = document.getElementById('viewer-3d');
        let config = { backgroundColor: '#020617' }; // Sleek dark background
        
        // Create the 3Dmol viewer instance
        viewer3D = $3Dmol.createViewer(element, config);
        
        // Load default molecule (Benzene)
        loadMolecule('241', 'Benzene'); 
    }
}

function loadMolecule(cid, name) {
    if (!viewer3D) return;
    
    document.getElementById('mol-loading').innerText = "Fetching Data...";
    document.getElementById('mol-loading').style.display = 'block';
    document.getElementById('current-mol-name').innerText = name || `CID: ${cid}`;
    
    viewer3D.clear(); // Clear the previous molecule
    
    // Download directly from PubChem API using CID
    $3Dmol.download(`cid:${cid}`, viewer3D, {}, function() {
        document.getElementById('mol-loading').style.display = 'none';
        
        // Apply the currently selected visual style
        applyCurrentMolStyle();
        
        viewer3D.zoomTo();
        // Add a gentle auto-spin so it looks dynamic immediately
        viewer3D.spin('y', 0.5); 
    });
}

// --- NEW: Function to handle visual styles ---
function applyCurrentMolStyle() {
    if (!viewer3D) return;
    const style = document.getElementById('mol-style-select').value;
    
    if (style === 'ballAndStick') {
        viewer3D.setStyle({}, { stick: { radius: 0.15, colorscheme: 'Jmol' }, sphere: { scale: 0.3, colorscheme: 'Jmol' } });
    } else if (style === 'spacefill') {
        viewer3D.setStyle({}, { sphere: { colorscheme: 'Jmol' } }); // Full size spheres showing atomic radius
    } else if (style === 'stick') {
        viewer3D.setStyle({}, { stick: { radius: 0.2, colorscheme: 'Jmol' } }); // Thicker bonds, no spheres
    } else if (style === 'wireframe') {
        viewer3D.setStyle({}, { line: { colorscheme: 'Jmol' } }); // Thin lines for complex structures
    }
    viewer3D.render();
}

// --- UPDATED: Search by Name using PubChem REST API ---
async function searchCustomMolecule() {
    const query = document.getElementById('custom-mol-input').value.trim();
    if (!query) {
        alert("Please enter a molecule name.");
        return;
    }
    
    const loadingText = document.getElementById('mol-loading');
    loadingText.innerText = "Searching Database...";
    loadingText.style.display = 'block';
    
    try {
        // Step 1: Translate the chemical name into a PubChem CID behind the scenes
        const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`);
        
        if (!res.ok) {
            alert(`Could not find "${query}". Please check the spelling.`);
            loadingText.style.display = 'none';
            return;
        }
        
        const data = await res.json();
        
        // Step 2: Extract the CID and load the 3D model
        if (data.IdentifierList && data.IdentifierList.CID && data.IdentifierList.CID.length > 0) {
            const cid = data.IdentifierList.CID[0];
            // Format the name nicely (e.g., capitalize first letter)
            const formattedName = query.charAt(0).toUpperCase() + query.slice(1);
            loadMolecule(cid, formattedName);
        }
    } catch (err) {
        alert("Error connecting to PubChem database.");
        loadingText.style.display = 'none';
    }
}

// --- ⏱️ FOCUS MODE / POMODORO LOGIC ---
let focusInterval = null;
let focusTotalSeconds = 25 * 60; // Default 25 mins
let focusSecondsLeft = focusTotalSeconds;
let isFocusRunning = false;
const focusCircumference = 326.7; // 2 * pi * 52 (radius)

function toggleFocusWidget() {
    const widget = document.getElementById('focus-widget');
    if (widget.classList.contains('show')) {
        widget.classList.remove('show');
        setTimeout(() => { widget.style.display = 'none'; }, 300); // Wait for transition
    } else {
        widget.style.display = 'flex';
        // Tiny timeout to allow display:flex to apply before adding opacity class
        setTimeout(() => { widget.classList.add('show'); }, 10);
        updateFocusUI();
    }
}

function setFocusTime(minutes) {
    if (isFocusRunning) return; // Prevent changing time while running
    focusTotalSeconds = minutes * 60;
    focusSecondsLeft = focusTotalSeconds;
    updateFocusUI();
}

function updateFocusUI() {
    // 1. Update Text
    const m = Math.floor(focusSecondsLeft / 60);
    const s = focusSecondsLeft % 60;
    document.getElementById('focus-time').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;

    // 2. Update SVG Ring
    const ring = document.getElementById('focus-ring');
    const percent = focusSecondsLeft / focusTotalSeconds;
    const offset = focusCircumference - (percent * focusCircumference);
    ring.style.strokeDashoffset = offset;
    
    // Change color when time is running low (< 1 minute)
    if (focusSecondsLeft < 60 && focusSecondsLeft > 0) {
        ring.setAttribute('stroke', '#ef4444'); // Red
    } else {
        ring.setAttribute('stroke', 'var(--gold)'); // Gold
    }
}

function toggleFocusTimer() {
    const btn = document.getElementById('focus-start-btn');
    
    if (isFocusRunning) {
        // Pause
        clearInterval(focusInterval);
        isFocusRunning = false;
        btn.innerText = "Resume";
        btn.style.background = "#fbbf24"; // Gold
    } else {
        // Start
        if (focusSecondsLeft <= 0) resetFocusTimer(); // Prevent starting at 0
        
        isFocusRunning = true;
        btn.innerText = "Pause";
        btn.style.background = "#f59e0b"; // Darker gold
        
        focusInterval = setInterval(() => {
            focusSecondsLeft--;
            updateFocusUI();
            
            if (focusSecondsLeft <= 0) {
                clearInterval(focusInterval);
                isFocusRunning = false;
                btn.innerText = "Start";
                
                // Play a completion sound using browser synthesis
                if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance("Focus session complete. Great job!");
                    window.speechSynthesis.speak(msg);
                }
                
                // Trigger the chemical explosion to celebrate!
                if(typeof triggerChemicalExplosion === "function") {
                    triggerChemicalExplosion();
                }
                
                // Turn off Zen Mode if it was on
                document.getElementById('zen-mode-check').checked = false;
                toggleZenMode();
            }
        }, 1000);
    }
}

function resetFocusTimer() {
    clearInterval(focusInterval);
    isFocusRunning = false;
    focusSecondsLeft = focusTotalSeconds;
    const btn = document.getElementById('focus-start-btn');
    btn.innerText = "Start";
    btn.style.background = "var(--gold)";
    updateFocusUI();
}

function toggleZenMode() {
    const isZen = document.getElementById('zen-mode-check').checked;
    if (isZen) {
        document.body.classList.add('zen-mode');
    } else {
        document.body.classList.remove('zen-mode');
    }
}


// NOTE: addMechStepToDraft, renderMechDraft, uploadMechanism, and loadAdminMechList
// are defined above. The duplicate definitions below have been removed.

// --- STUDENT VIEWER LOGIC ---

// Default mechanisms so the viewer is never empty!
const defaultMechanisms = [
    {
        id: 'sn1',
        title: "SN1 Reaction (Unimolecular Nucleophilic Substitution)",
        desc: "A two-step mechanism favored by tertiary alkyl halides in polar protic solvents. The rate depends entirely on the formation of the carbocation.",
        steps: [
            { title: "Step 1: Leaving Group Departs", visual: "(CH₃)₃C-Br &nbsp;&rarr;&nbsp; (CH₃)₃C⁺ + Br⁻", text: "The carbon-halogen bond breaks heterolytically. The leaving group (Bromide) departs, forming a planar, sp² hybridized tertiary carbocation. This is the slow, rate-determining step." },
            { title: "Step 2: Nucleophilic Attack", visual: "Nu⁻ + (CH₃)₃C⁺ &nbsp;&rarr;&nbsp; (CH₃)₃C-Nu", text: "The nucleophile attacks the planar carbocation rapidly. Because it can attack from either the top or bottom face, chiral centers will result in a racemic mixture (both enantiomers)." }
        ]
    },
    {
        id: 'sn2',
        title: "SN2 Reaction (Bimolecular Nucleophilic Substitution)",
        desc: "A single-step, concerted mechanism favored by primary alkyl halides in polar aprotic solvents. Rate depends on both the substrate and the nucleophile.",
        steps: [
            { title: "Concerted Backside Attack", visual: "Nu⁻ &nbsp;&rarr;&nbsp; CH₃-Br<br><br><span style='font-size: 1.2rem; color: #64748b;'>[ Nu&middot;&middot;&middot;CH₃&middot;&middot;&middot;Br ]⁻ &nbsp;(Transition State)</span><br><br>Nu-CH₃ + Br⁻", text: "The nucleophile attacks the electrophilic carbon exactly opposite the leaving group (backside attack). Bond formation and breaking happen simultaneously, causing an inversion of stereochemistry (Walden inversion)." }
        ]
    },
    {
        id: 'eas',
        title: "Electrophilic Aromatic Substitution (EAS)",
        desc: "Aromatic rings react with highly reactive electrophiles, temporarily losing aromaticity before regaining it to form a substituted product.",
        steps: [
            { title: "Step 1: Generation of Electrophile", visual: "E-Nu + Lewis Acid &nbsp;&rarr;&nbsp; E⁺ + [Nu-Acid]⁻", text: "A strong Lewis Acid catalyst (like AlCl₃ or FeBr₃) interacts with the reagent to generate a powerful, active electrophile (E⁺)." },
            { title: "Step 2: Formation of Sigma Complex", visual: "C₆H₆ + E⁺ &nbsp;&rarr;&nbsp; [C₆H₆E]⁺", text: "The pi electrons of the benzene ring attack the electrophile. This breaks aromaticity and forms a non-aromatic, resonance-stabilized carbocation known as the Arenium ion (or Sigma complex)." },
            { title: "Step 3: Deprotonation", visual: "[C₆H₆E]⁺ + Base &nbsp;&rarr;&nbsp; C₆H₅E + H-Base⁺", text: "A base removes a proton from the sp³ hybridized carbon bearing the electrophile. The electrons fall back into the ring, restoring the highly stable aromatic pi system." }
        ]
    },
    {
        id: 'e1',
        title: "E1 Elimination (Unimolecular)",
        desc: "A two-step elimination process competing with SN1. A leaving group leaves to form a carbocation, followed by deprotonation to form an alkene.",
        steps: [
            { title: "Step 1: Formation of Carbocation", visual: "R₂CH-CR₂-X &nbsp;&rarr;&nbsp; R₂CH-C⁺R₂ + X⁻", text: "Similar to SN1, the leaving group departs first, forming a stable intermediate carbocation. This is the slow step." },
            { title: "Step 2: Deprotonation", visual: "Base: + H-C-C⁺ &nbsp;&rarr;&nbsp; C=C + Base-H⁺", text: "A weak base extracts a proton from a carbon adjacent (beta) to the positive charge. The electrons form a pi bond, creating an alkene (favoring the more substituted Zaitsev product)." }
        ]
    }
];

let dynamicMechData = {};
let currentMech = '';
let currentMechStep = 0;

async function openMechViewer() {
    openModal('mech-modal');
    
    document.getElementById('mech-desc').innerHTML = "Loading mechanisms...";
    document.getElementById('mech-visual').innerHTML = "";
    document.getElementById('mech-select').innerHTML = "<option>Loading...</option>";
    
    let dataToLoad = [];

    try {
        const res = await fetch('/api/mechanisms');
        const data = await res.json();
        
        // If the database has mechanisms, use them. Otherwise, use defaults.
        if(data && data.length > 0) {
            dataToLoad = data;
        } else {
            dataToLoad = defaultMechanisms;
        }
    } catch(e) {
        // If backend API isn't set up yet, fallback to defaults smoothly
        console.log("Loading default mechanisms.");
        dataToLoad = defaultMechanisms;
    }

    dynamicMechData = {};
    let selectHtml = "";
    
    dataToLoad.forEach(m => {
        dynamicMechData[m.id] = m;
        selectHtml += `<option value="${m.id}">${m.title}</option>`;
    });
    
    document.getElementById('mech-select').innerHTML = selectHtml;
    loadMechanism(dataToLoad[0].id); // Load the first mechanism automatically
}

function loadMechanism(mechKey) {
    currentMech = mechKey;
    currentMechStep = 0;
    const data = dynamicMechData[mechKey];
    if(!data) return;
    
    document.getElementById('mech-desc').innerHTML = `<strong>Overview:</strong><br>${data.desc}`;
    updateMechUI();
}

function updateMechUI() {
    const data = dynamicMechData[currentMech];
    if(!data || !data.steps || data.steps.length === 0) return;
    
    const stepData = data.steps[currentMechStep];
    
    document.getElementById('mech-step-title').innerHTML = stepData.title;
    
    // SMART RENDERER: Checks if the visual is an uploaded image/SVG or just text!
    if(stepData.visual.startsWith('data:image') || stepData.visual.startsWith('http')) {
        document.getElementById('mech-visual').innerHTML = `<img src="${stepData.visual}" style="max-width: 100%; max-height: 250px; object-fit: contain;">`;
    } else {
        document.getElementById('mech-visual').innerHTML = `<span style="font-family: monospace; font-size: 1.8rem; color: #b45309; font-weight: 800; letter-spacing: 1px;">${stepData.visual}</span>`;
    }
    
    document.getElementById('mech-step-text').innerHTML = `<strong>What's happening?</strong><br>${stepData.text}`;
    
    document.getElementById('mech-progress').innerText = `${currentMechStep + 1} / ${data.steps.length}`;
    
    document.getElementById('mech-prev').style.visibility = currentMechStep === 0 ? 'hidden' : 'visible';
    document.getElementById('mech-next').style.visibility = currentMechStep === data.steps.length - 1 ? 'hidden' : 'visible';
}

function changeMechStep(dir) {
    currentMechStep += dir;
    updateMechUI();
}

// ==========================================
// 🪙 ARC COINS & GAMIFICATION ENGINE
// ==========================================

// 1. Core Coin Updater
async function updateCoins(amount, reason) {
    if(!user) return;
    
    // Initialize if null
    user.coins = user.coins || 0;
    user.coins += amount;
    
    // Save locally
    localStorage.setItem('arc_user', JSON.stringify(user));
    
    // Update UI
    const navWallet = document.getElementById('wallet-coins');
    const storeWallet = document.getElementById('store-big-coins');
    if(navWallet) navWallet.innerText = user.coins;
    if(storeWallet) storeWallet.innerText = user.coins;
    
    // Check and assign titles based on new balance
    updateStudentTitle();

    if(amount > 0) {
        // Show a fun alert
        alert(`🎉 +${amount} ARC Coins!\nReason: ${reason}`);
        if(typeof triggerChemicalExplosion === "function") triggerChemicalExplosion(); 
    }

    // 🔒 SECURE BACKEND SYNC: Now sends the dates to the database to prevent multi-device cheating!
    try {
        await fetch('/api/student/update-coins', { 
            method: 'POST', headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ 
                email: user.email, 
                coins: user.coins,
                lastLoginDate: user.lastLoginDate, // Synced to DB
                lastPotdDate: user.lastPotdDate,    // Synced to DB
                amount: amount, // For Ledger
                reason: reason  // For Ledger
            }) 
        });
    } catch(e) { console.log("Coin sync failed."); }
}

// 2. Titles and Badges
function updateStudentTitle() {
    if(!user) return;
    let c = user.coins || 0;
    let title = "Beginner"; let badge = "🌱";

    if(c >= 100) { title = "Scholar"; badge = "📘"; }
    if(c >= 500) { title = "Alchemist"; badge = "⚗️"; }
    if(c >= 1000) { title = "Organic Master"; badge = "🔥"; }
    if(c >= 3000) { title = "JEE/NEET Conqueror"; badge = "👑"; }
    if(c >= 10000) { title = "ARC Legend"; badge = "💎"; }

    user.title = title;
    user.badge = badge;
    localStorage.setItem('arc_user', JSON.stringify(user));

    const badgeEl = document.getElementById('student-badge-title');
    if(badgeEl) badgeEl.innerText = `${badge} ${title}`;
}

// 3. Daily Login Bonus (Call this inside your window.onload if user exists)
function checkDailyLogin() {
    if(!user) return;
    const todayDate = new Date().toDateString();
    
    if(user.lastLoginDate !== todayDate) {
        user.lastLoginDate = todayDate;
        localStorage.setItem('arc_user', JSON.stringify(user));
        
        // Slight delay so they see the UI load first
        setTimeout(() => {
            updateCoins(5, "Daily Login Bonus!");
        }, 1500);
    } else {
        // Just update UI to current balance
        updateCoins(0, ""); 
    }
}

// 4. POTD Logic Override (Award 10 coins, only once)
// Find your existing checkPOTD function and replace it with this:
function checkPOTD(sel) {
    if(!user) return alert("Please login to answer the POTD!");
    
    const todayDate = new Date().toDateString();
    if(user.lastPotdDate === todayDate) {
        return alert("You have already answered today's POTD! Come back tomorrow.");
    }

    const resDiv = document.getElementById('potd-result'); 
    resDiv.style.display = 'block';
    
    if(sel === currentPOTD.correct) { 
        resDiv.innerHTML = `✅ Correct!<br><br><b>Solution:</b><br>${currentPOTD.solution}`; 
        resDiv.style.background = 'rgba(34, 197, 94, 0.2)'; 
        
        // Lock it for today and award coins!
        user.lastPotdDate = todayDate;
        localStorage.setItem('arc_user', JSON.stringify(user));
        updateCoins(10, "Solved the Problem of the Day!");
    } else { 
        resDiv.innerHTML = `❌ Incorrect. Try again or check the solution!`; 
        resDiv.style.background = 'rgba(239, 68, 68, 0.2)'; 
        // We do NOT lock it, so they can keep trying until they learn it!
    }
}

// ==========================================
// 🛒 DYNAMIC PREMIUM STORE LOGIC
// ==========================================

window.adminTestsList = [];
window.adminMatsList = [];

// This function dynamically switches between a Text Input and a Dropdown
async function updateStoreInputUI() {
    const type = document.getElementById('store-type').value;
    const container = document.getElementById('store-link-container');

    if (type === 'test') {
        if(window.adminTestsList.length === 0) { const res = await fetch('/api/tests'); window.adminTestsList = await res.json(); }
        container.innerHTML = `<select id="store-link" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc;">
            <option value="">-- Select an Existing Practice Test --</option>
            ${window.adminTestsList.map(t => `<option value="${t._id}">${t.title}</option>`).join('')}
        </select>`;
    } else if (type === 'pdf') {
        if(window.adminMatsList.length === 0) { const res = await fetch('/api/materials'); window.adminMatsList = await res.json(); }
        container.innerHTML = `<select id="store-link" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc;">
            <option value="">-- Select an Existing Library File --</option>
            ${window.adminMatsList.map(m => `<option value="${m._id}">${m.title}</option>`).join('')}
        </select>`;
    } else {
        container.innerHTML = `<input id="store-link" placeholder="Secret Video Link or Access Passcode" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ccc; box-sizing:border-box;">`;
    }
}

// 1. Admin UI injected into the Teacher Panel
// Add this inside your showAdm(tab) function alongside the other tabs

async function uploadStoreItem() {
    const body = {
        title: document.getElementById('store-title').value,
        type: document.getElementById('store-type').value,
        cost: parseInt(document.getElementById('store-cost').value),
        link: document.getElementById('store-link').value
    };
    if(!body.title || !body.cost || !body.link) return alert("Please fill Title, Cost, and select a file/test!");
    
    await fetch('/api/admin/store', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    alert("Item Added to Store! The Premium badge will now show on it."); 
    showAdm('store'); fetchGlobalStoreData(); loadDynamicStore();
}

async function loadAdminStoreList() {
    try {
        const res = await fetch('/api/store'); const data = await res.json();
        document.getElementById('admin-store-list').innerHTML = `<table><tr><th>Title</th><th>Type</th><th>Cost</th><th>Action</th></tr>` + 
        data.map(i => `<tr><td>${i.title}</td><td>${i.type}</td><td>${i.cost} 🪙</td><td><button class="btn-red btn-small" onclick="deleteItem('store','${i._id}')">Del</button></td></tr>`).join('') + `</table>`;
    } catch(e) {}
}

async function loadDynamicStore() {
    if (dynamicStoreData.length === 0) {
        document.getElementById('store-dynamic-content').innerHTML = "<p style='text-align:center; width:100%; color:#cbd5e1;'>Store is currently empty. Teacher is adding items soon!</p>"; return;
    }
    
    let html = "";
    dynamicStoreData.forEach(item => {
        let icon = "🎁"; let borderColor = "#eee";
        if(item.type === 'discount') { icon = "💸"; borderColor = "var(--green)"; }
        if(item.type === 'pdf') { icon = "📑"; }
        if(item.type === 'test') { icon = "🔒"; }
        if(item.type === 'video') { icon = "📹"; }

        // Change button if they already own it!
        const alreadyOwned = user && user.unlockedItems && user.unlockedItems.includes(item.link);
        
        let btnHtml = "";
        if (alreadyOwned) {
            btnHtml = `<button class="btn" style="background:var(--green); color:white; cursor:pointer; box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);" onclick="accessUnlockedStoreItem('${item.type}', '${item.link}')">✅ Open Now</button>`;
        } else {
            btnHtml = `<button class="btn btn-gold" onclick="buyDynamicItem('${item._id}')">Unlock for ${item.cost} <div class="arc-coin"></div></button>`;
        }

        // 👇 THIS IS THE PART THAT WAS MISSING! 👇
        html += `<div class="card" style="text-align: center; border: 2px solid ${borderColor};">
                    <div style="font-size: 3rem;">${icon}</div>
                    <h4 style="margin: 15px 0;">${item.title}</h4>
                    ${btnHtml}
                 </div>`;
    });
    document.getElementById('store-dynamic-content').innerHTML = html;
}
function accessUnlockedStoreItem(type, link) {
    if (type === 'test') {
        startTest(link, false, null); // Automatically opens the test
    } else if (type === 'pdf') {
        openMat(link); // Automatically opens the PDF
    }
}

async function buyDynamicItem(id) {
    if(!user) return openStoreAlert('error', 'Login Required', 'Please login to access the store!');
    
    const item = dynamicStoreData.find(i => i._id === id); 
    if(!item) return;

    // ❌ INSUFFICIENT COINS
    if(user.coins < item.cost) {
        return openStoreAlert('error', 'Insufficient Coins', `You need <b style="color:var(--gold);">${item.cost - user.coins} more</b> <div class="arc-coin"></div> to unlock this.`);
    }

    // 🤔 CONFIRM PURCHASE
    openStoreAlert('confirm', 'Confirm Purchase', `Spend <b style="color:var(--gold);">${item.cost}</b> <div class="arc-coin"></div> to unlock:<br><br><b style="color:white; font-size:1.1rem;">${item.title}</b>?`, async () => {
        
        if (item.type === 'test' || item.type === 'pdf') {
            const res = await fetch('/api/student/buy-item', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ email: user.email, itemId: item.link, cost: item.cost, title: item.title })
            });
            const data = await res.json();
            
            if(data.success) {
                user.coins = data.coins;
                user.unlockedItems = data.unlockedItems;
                localStorage.setItem('arc_user', JSON.stringify(user));
                updateStudentTitle();
                document.getElementById('wallet-coins').innerText = user.coins;
                document.getElementById('store-big-coins').innerText = user.coins;
                
                // 🎉 SUCCESS!
                openStoreAlert('success', 'Unlocked!', 'Item permanently unlocked. You can now open it from the Library or Tests section without a password!');
                if(typeof triggerChemicalExplosion === "function") triggerChemicalExplosion();
                loadDynamicStore(); 
                
                // Route them to what they just bought
                if(item.type === 'test') show('tests');
                if(item.type === 'pdf') show('library');
            } else {
                openStoreAlert('error', 'Transaction Failed', data.message || "An error occurred.");
            }
        } 
        else {
            // Discounts and Videos behave normally
            updateCoins(-item.cost, `Purchased: ${item.title}`);
            
            if(item.type === 'discount') {
                const code = `ARC-${Math.floor(100000 + Math.random() * 900000)}`;
                
                // Send email to backend so it tracks everything securely
                fetch('/api/admin/log-discount', { 
                    method: 'POST', 
                    headers: {'Content-Type':'application/json'}, 
                    body: JSON.stringify({ email: user.email, item: item.title, code: code }) 
                });

                // Generate and open the Certificate Modal immediately
                reopenCertificate(user.name, user.email, item.title, code, new Date().toISOString());
                
                loadDynamicStore();
                setTimeout(loadMyDiscounts, 1000); // Refresh active discounts list
            } 
            else if (item.type === 'video') {
                openStoreAlert('success', 'Access Granted!', 'Opening Secret Video in a new tab...');
                setTimeout(() => window.open(item.link, '_blank'), 1500); 
                loadDynamicStore();
            }
        }
    });
}

// --- PREMIUM BADGE LOGIC ---
let dynamicStoreData = [];
async function fetchGlobalStoreData() {
    try {
        const res = await fetch('/api/store');
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        const data = await res.json();
        dynamicStoreData = Array.isArray(data) ? data : [];
        
        // Only draw the store AFTER the data arrives!
        loadDynamicStore(); 
    } catch(e) {
        console.error("Store data load error:", e);
        dynamicStoreData = []; // Always keep it a safe empty array
    }
}

// NOTE: loadTests is defined above (full-featured version with ongoing test banner, resume button, and holographic badges)

// ==========================================
// 🛡️ ANTI-PIRACY & SECURITY GUARD
// ==========================================

function initSecurityShield() {
    // Only apply these strict rules if the user is NOT an admin
    if (user && user.role === 'admin') {
        document.body.classList.add('admin-mode');
        return; 
    }

    // 1. Disable Right Click (Context Menu)
    document.addEventListener('contextmenu', event => {
        // Only block if they are taking a test or viewing a PDF
        if(document.getElementById('exam').classList.contains('active') || document.getElementById('pdf-modal').style.display === 'flex') {
            event.preventDefault();
            showSecurityWarning("Right-click is disabled on premium content.");
        }
    });

    // 2. Disable Keyboard Shortcuts (Copy, Cut, Paste, Print)
    document.addEventListener('keydown', (e) => {
        if(document.getElementById('exam').classList.contains('active') || document.getElementById('pdf-modal').style.display === 'flex') {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'p' || e.key === 's' || e.key === 'x')) {
                e.preventDefault();
                showSecurityWarning("Copying and Printing are disabled.");
            }
            // Block common screenshot tools (Mac)
            if (e.metaKey && e.shiftKey) {
                document.body.style.filter = 'blur(15px)';
                setTimeout(() => { document.body.style.filter = 'none'; }, 3000);
            }
        }
    });

    // 3. Screen Blur on Snipping Tool (Window Focus Loss)
    window.addEventListener('blur', () => {
        if(document.getElementById('exam').classList.contains('active') || document.getElementById('pdf-modal').style.display === 'flex') {
            // Blurs the screen if they click off the browser to open a screen recorder
            document.body.style.filter = 'blur(15px)';
        }
    });

    window.addEventListener('focus', () => {
        document.body.style.filter = 'none';
    });
}

function showSecurityWarning(msg) {
    // Reusing your custom alert modal
    document.getElementById('alert-msg').innerHTML = `🛡️ <br><br>${msg}`;
    openModal('alert-modal');
}

// --- DYNAMIC WATERMARK ---
function toggleWatermark(show) {
    let wmLayer = document.getElementById('watermark-layer');
    
    // Create the layer if it doesn't exist
    if (!wmLayer) {
        wmLayer = document.createElement('div');
        wmLayer.id = 'watermark-layer';
        document.body.appendChild(wmLayer);
    }

    if (show && user && user.role !== 'admin') {
        wmLayer.style.display = 'block';
        // Create a repeating grid of their email
        const identifier = `${user.email} | DO NOT SHARE`;
        let html = '<div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 100px; padding: 50px;">';
        for(let i=0; i<30; i++) {
            html += `<div class="wm-text">${identifier}</div>`;
        }
        html += '</div>';
        wmLayer.innerHTML = html;
    } else {
        wmLayer.style.display = 'none';
    }
}

function triggerPassError() {
    const errEl = document.getElementById('cp-error');
    if (errEl) {
        errEl.style.display = 'block';
        // Add a little shake animation for incorrect password
        const modalContent = document.querySelector('#coolPassModal .modal-content');
        modalContent.style.transform = 'translate(-10px, 0)';
        setTimeout(() => modalContent.style.transform = 'translate(10px, 0)', 50);
        setTimeout(() => modalContent.style.transform = 'translate(-10px, 0)', 100);
        setTimeout(() => modalContent.style.transform = 'translate(0, 0)', 150);
    } else {
        alert("Incorrect Password!");
    }
}

// --- COIN LEDGER LOGIC ---
async function openCoinHistory() {
    if(!user) return;
    openModal('coin-history-modal');
    document.getElementById('coin-history-body').innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">Fetching records...</td></tr>';
    
    try {
        const res = await fetch('/api/student/coin-history', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email: user.email })
        });
        const history = await res.json();
        
        if(history.length === 0) {
            document.getElementById('coin-history-body').innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px; color: #94a3b8;">No coin transactions found. Start taking tests to earn!</td></tr>';
        } else {
            document.getElementById('coin-history-body').innerHTML = history.map(h => {
                const isPositive = h.amount > 0;
                const amountStr = isPositive ? `<span style="color:var(--green);">+${h.amount}</span>` : `<span style="color:var(--red);">${h.amount}</span>`;
                return `<tr>
                    <td style="border-bottom: 1px solid #334155; padding: 12px; font-size: 0.85rem; color: #94a3b8;">${new Date(h.date).toLocaleDateString()}</td>
                    <td style="border-bottom: 1px solid #334155; padding: 12px;">${h.reason}</td>
                    <td style="border-bottom: 1px solid #334155; padding: 12px; font-weight: bold; font-size: 1.1rem;">${amountStr}</td>
                </tr>`;
            }).join('');
        }
    } catch(e) {
        document.getElementById('coin-history-body').innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--red);">Error loading history.</td></tr>';
    }
}

// --- 🎓 ACTIVE DISCOUNTS & CERTIFICATE LOGIC ---
async function loadMyDiscounts() {
    if(!user) return;
    try {
        const res = await fetch('/api/student/my-discounts', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email: user.email })
        });
        const data = await res.json();
        const container = document.getElementById('my-active-discounts');
        
        if(data.length > 0) {
            let html = `<h3 style="color:var(--gold); border-bottom:2px solid var(--primary); padding-bottom:5px;">🎫 My Active Discounts</h3><div class="grid">`;
            data.forEach(d => {
                // Calculate expiration date
                const expDate = new Date(new Date(d.date).getTime() + 30*24*60*60*1000);
                
                html += `<div class="card" style="border: 2px dashed ${d.isVerified ? '#ccc' : 'var(--green)'}; text-align:center; background:${d.isVerified ? '#f8fafc' : '#f0fdf4'};">
                    <h4 style="margin:0 0 10px 0; color:${d.isVerified ? '#666' : 'var(--green)'};">${d.isVerified ? '✅ Claimed' : '🎫 Available'}: ${d.item}</h4>
                    <p style="font-size:0.9rem; color:#666; margin-top:0;">Valid until: ${expDate.toLocaleDateString()}</p>
                    <button class="btn btn-gold" onclick="reopenCertificate('${d.studentName}', '${d.studentEmail}', '${d.item}', '${d.code}', '${d.date}', ${d.isVerified})">📥 View Certificate</button>
                </div>`;
            });
            html += `</div>`;
            container.innerHTML = html;
        } else {
            container.innerHTML = "";
        }
    } catch(e) { console.error("Error loading active discounts"); }
}

function reopenCertificate(name, email, item, code, dateStr, isVerified = false) {
    document.getElementById('cert-name').innerText = name;
    document.getElementById('cert-email').innerText = email;
    document.getElementById('cert-item').innerText = item;
    document.getElementById('cert-code').innerText = code;
    document.getElementById('cert-date').innerText = new Date(dateStr).toLocaleDateString();
    
    // Toggle the watermark dynamically
    const watermark = document.getElementById('cert-watermark');
    if(watermark) {
        watermark.style.display = isVerified ? 'block' : 'none';
    }
    
    openModal('certificate-modal');
}

// --- 📥 DOWNLOAD CERTIFICATE LOGIC ---
function downloadCertificate() {
    const node = document.getElementById('certificate-node');
    // html2canvas takes a perfect screenshot of the div
    html2canvas(node, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `ARC_Discount_${document.getElementById('cert-name').innerText.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

async function loadAdminDiscounts() {
    const res = await fetch('/api/admin/discount-logs');
    const data = await res.json();
    
    if(data.length === 0) {
        document.getElementById('admin-discount-list').innerHTML = `<tr><td colspan="6" style="text-align:center; color:#999;">No discounts purchased yet.</td></tr>`;
        return;
    }

    document.getElementById('admin-discount-list').innerHTML = data.map(d => `
        <tr style="${d.isVerified ? 'opacity: 0.5; background: #f8fafc;' : ''}">
            <td>${new Date(d.date).toLocaleDateString()}</td>
            <td><b>${d.studentName}</b><br><small style="color:#666;">${d.studentEmail}<br>📞 ${d.studentPhone}</small></td>
            <td style="font-family: monospace; font-size: 1.1rem; color: var(--primary);"><b>${d.code}</b></td>
            <td>${d.item}</td>
            <td>
                ${d.isVerified 
                    ? `<span class="badge bg-green">Used</span>` 
                    : `<span class="badge bg-gold">Pending</span>`}
            </td>
            <td>F
                <button class="btn btn-small ${d.isVerified ? 'btn-red' : 'btn-gold'}" style="margin-bottom:5px; width:100%;" onclick="toggleDiscountStatus('${d._id}')">
                    ${d.isVerified ? 'Undo' : 'Verify & Claim'}
                </button>
                <button class="btn-small btn-red" style="width:100%;" onclick="deleteItem('discount-log', '${d._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function toggleDiscountStatus(id) {
    await fetch(`/api/admin/discount-logs/${id}`, { method: 'PUT' });
    loadAdminDiscounts();
}


async function loadAdminWheelList() {
    const res = await fetch('/api/wheel');
    const data = await res.json();
    document.getElementById('admin-wheel-list').innerHTML = `<table><tr><th>Color</th><th>Label</th><th>Type</th><th>Value</th><th>Action</th></tr>` + 
    data.map(w => `<tr>
        <td><div style="width:20px; height:20px; background:${w.color}; border-radius:50%; border:1px solid #333;"></div></td>
        <td>${w.label}</td><td>${w.type}</td><td>${w.value}</td>
        <td>${w._id ? `<button class="btn-red btn-small" onclick="deleteItem('wheel', '${w._id}')">Del</button>` : 'Default'}</td>
    </tr>`).join('') + `</table>`;
}

async function addWheelPrize() {
    const body = {
        label: document.getElementById('w-label').value,
        type: document.getElementById('w-type').value,
        value: parseInt(document.getElementById('w-val').value) || 0,
        color: document.getElementById('w-color').value
    };
    if(!body.label) return alert("Label is required!");
    await fetch('/api/admin/wheel', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    alert("Slice added to wheel!");
    document.getElementById('w-label').value = "";
    loadAdminWheelList();
}