function renderScroll(scroll) {
  console.log("RENDER", scroll, Math.floor($window.scrollTop()))
    $bodyhtml.animate({ scrollTop: scroll }, 1500, 'linear');
}

function animateScrollBar() {
  var percent = (scrollTop / bodyHeight).toFixed(2) * 100;
  $experienceIndicator.css({
      'transform':    'translateY(' + percent + '%)'
    });
}
function buildScrollBarCenters() {
  frameFocus
    .map((center) => (center / bodyHeight).toFixed(2) * 100)
    .map((centerPercent) => centerPercent + "vh" )
    .map((centerVh) => {
      $("#experience-progress")
        .append('<div class="center-marker" style="top:'+ centerVh +'"></div>');
    });
}
