// Team Pandrover · odometer strip
// Pins the photo section and drives the strip sideways as you scroll.
// The counter interpolates between each card's kilometre reading.
// Below 900px (or with reduced motion) the cards simply stack; the
// stylesheet handles that, and the code below only runs the pinned mode.

(function () {
    var track = document.getElementById("odo-track");
    if (!track || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    var kmEl = document.getElementById("odo-km");
    var placeEl = document.getElementById("odo-place");
    var dateEl = document.getElementById("odo-date");
    var routeBg = document.getElementById("odo-route-bg");
    var routeFg = document.getElementById("odo-route-fg");
    var dotsG = document.getElementById("odo-dots");
    var cards = Array.prototype.slice.call(track.querySelectorAll(".card"));
    var stops = cards.map(function (c) {
        return { el: c, km: +c.dataset.km, place: c.dataset.place, date: c.dataset.date, x: 0, y: 0 };
    });

    var READ = 0.22; // fraction of the viewport width that acts as the "now" line

    function fmt(n) {
        return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function setActive(i) {
        stops.forEach(function (s, j) {
            s.el.classList.toggle("on", j === i);
        });
        var dots = dotsG.children;
        for (var j = 0; j < dots.length; j++) dots[j].classList.toggle("on", j === i);
        placeEl.textContent = stops[i].place;
        dateEl.textContent = stops[i].date;
    }

    // A smooth Catmull-Rom curve through every card's pin point.
    function buildRoute() {
        var lane = parseFloat(getComputedStyle(track).getPropertyValue("--lane")) || 0;
        stops.forEach(function (s, i) {
            var r = s.el;
            s.x = r.offsetLeft + r.offsetWidth / 2;
            // Even-indexed cards sit on the upper lane and pin just below themselves;
            // odd-indexed cards are dropped by one lane and pin just above.
            s.y = i % 2 === 0 ? r.offsetHeight + 34 : lane - 34;
        });
        var pts = stops.map(function (s) { return [s.x, s.y]; });
        var d = "M" + pts[0][0] + "," + pts[0][1];
        for (var i = 0; i < pts.length - 1; i++) {
            var p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
            var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
            var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
            d += " C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + p2[0] + "," + p2[1];
        }
        routeBg.setAttribute("d", d);
        routeFg.setAttribute("d", d);
        var len = routeFg.getTotalLength();
        routeFg.style.strokeDasharray = len;
        routeFg.style.strokeDashoffset = len;
        dotsG.innerHTML = "";
        pts.forEach(function (p) {
            var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", 12);
            dotsG.appendChild(c);
        });
        return len;
    }

    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", function () {
        var routeLen = buildRoute();
        var distance = function () { return track.offsetWidth - window.innerWidth; };
        var lastActive = -1;

        function update(x) {
            var read = x + window.innerWidth * READ;
            // kilometres: interpolate between the two stops around the read line
            var km = stops[0].km, idx = 0;
            if (read <= stops[0].x) { km = stops[0].km; idx = 0; }
            else if (read >= stops[stops.length - 1].x - 4) { km = stops[stops.length - 1].km; idx = stops.length - 1; }
            else {
                for (var i = 0; i < stops.length - 1; i++) {
                    if (read >= stops[i].x && read <= stops[i + 1].x) {
                        var t = (read - stops[i].x) / (stops[i + 1].x - stops[i].x);
                        km = stops[i].km + t * (stops[i + 1].km - stops[i].km);
                        idx = t < 0.5 ? i : i + 1;
                        break;
                    }
                }
            }
            kmEl.textContent = fmt(km);
            // route progress by horizontal fraction between first and last dot
            var f = Math.min(1, Math.max(0, (read - stops[0].x) / (stops[stops.length - 1].x - stops[0].x)));
            routeFg.style.strokeDashoffset = routeLen * (1 - f);
            if (idx !== lastActive) { lastActive = idx; setActive(idx); }
        }

        var tween = gsap.to(track, {
            x: function () { return -distance(); },
            ease: "none",
            scrollTrigger: {
                trigger: ".odo",
                start: "top top",
                end: function () { return "+=" + (distance() + window.innerHeight * 0.6); },
                pin: ".odo-pin",
                scrub: 0.6,
                invalidateOnRefresh: true,
                onUpdate: function (self) { update(self.progress * distance()); },
                onRefresh: function () { routeLen = buildRoute(); update(0); }
            }
        });
        update(0);

        return function () {
            tween.scrollTrigger && tween.scrollTrigger.kill();
            tween.kill();
            gsap.set(track, { clearProps: "transform" });
        };
    });

    // Stacked mode: highlight whichever card is mid-screen and keep the counter honest.
    mm.add("(max-width: 899px), (prefers-reduced-motion: reduce)", function () {
        if (!("IntersectionObserver" in window)) return;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var i = cards.indexOf(e.target);
                kmEl.textContent = fmt(stops[i].km);
                setActive(i);
            });
        }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
        cards.forEach(function (c) { io.observe(c); });
        return function () { io.disconnect(); };
    });
})();
