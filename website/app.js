// Pageloader removal
function removePageloader() {
    document.getElementById("pageloader").classList.remove("is-active")
}


// Horizontal scroller for image
var e = document.getElementById("scroller")
let ticking = false;

function updateScroll(viewportOffset) {
    // Calculate the fraction of the image scrolled over
    var scrollPercent = 0.5 + -0.5 * (viewportOffset.top) / window.innerHeight

    // Add a bezier function and convert to percentage
    var scrollPercent = (scrollPercent * scrollPercent * (3 - 2 * scrollPercent)) * 100

    // Update image horizontal position
    e.style.objectPosition = scrollPercent + "% 50%";
}

window.onscroll = function () {
    // Find scroll position
    var viewportOffset = e.getBoundingClientRect();

    if (!ticking) {
        window.requestAnimationFrame(function () {
            updateScroll(viewportOffset);
            ticking = false;
        })

        ticking = true;
    }
};