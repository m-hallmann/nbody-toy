var slideCounter = 0;
var slideCounterOld = 0;
var slides = document.getElementsByClassName('slide');


function addIframe(slideNr) {

  // delete all iframes
  var allIframes = document.querySelectorAll(".slide iframe");
  for (var i = 0; i < allIframes.length; i++) {
      allIframes[i].setAttribute("src","");
  }

  var activeSlide = document.querySelectorAll(".slide-"+slideNr)[0];
  var src = activeSlide.getAttribute('data-src');

  if (src) {
    activeSlide.insertAdjacentHTML('afterbegin', '<iframe class="stage" src="'+src+'"></iframe>');
  }
}


slides[0].classList.add('active');
for (var i = 0; i < slides.length; i++) {
    slides[i].classList.add('slide-'+i);
}

document.body.addEventListener("keyup", function(event) {
    // arrow.right arrow.bottom spacebar enter
    if (event.isComposing || event.keyCode === 39 || event.keyCode === 40 || event.keyCode === 32 || event.keyCode === 13) {
        slideCounter++;
    }
    // arrow.up arrow.left backspace escape
    else if (event.keyCode === 37 || event.keyCode === 38 || event.keyCode === 8 || event.keyCode === 27) {
        slideCounter--;
    }
    // home
    else if (event.keyCode === 36) {
        slideCounter = 0;
    }
    // home
    else if (event.keyCode === 35) {
        slideCounter = slides.length;
    }
    if (slideCounter < 0) { slideCounter = 0 }
    if (slideCounter >= slides.length) { slideCounter = slides.length-1 }

    if (slideCounter != slideCounterOld) {
        for (var i = 0; i < slides.length; i++) {
            slides[i].classList.remove("active");
            //slides[i].getElementById('iframe-'+i).setAttribute('src', '');
        }
        console.log(slideCounter);
        slides[slideCounter].classList.add("active");
        //slides[slideCounter].getElementById('iframe-' + slideCounter).setAttribute(
        //    'src',
            //slides[slideCounter].getElementById('iframe-' + slideCounter).dataset.src
        //);
    }
    addIframe(slideCounter);
    slideCounterOld = slideCounter;
  });

addIframe(0);


// Lazyloader
document.addEventListener("DOMContentLoaded", function () {
    var lazyItems = document.getElementsByClassName("vie-lazy");
    for (i = 0; i < lazyItems.length; i++) {
        lazyItems[i].setAttribute('src', lazyItems[i].dataset.src);
        if (lazyItems[i].dataset.srcset) {
            lazyItems[i].setAttribute('srcset', lazyItems[i].dataset.srcset);
        }
    }
});
