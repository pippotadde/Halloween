// Effetto suono "troll" - innocuo e divertente
const troll = new Audio("troll.mp3");
document.addEventListener("click", () => {
    troll.currentTime = 0;
    troll.play().catch(() => {});
});
