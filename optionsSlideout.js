import Slideout from 'slideout';

var slideout = new Slideout({
  'panel': document.getElementById('panel'),
  'menu': document.getElementById('menu'),
  'padding': 256,
  'tolerance': 70
});

document.querySelector('.toggle-button').addEventListener('click', function() {
  slideout.toggle();
});

document.getElementById("panel").addEventListener('mouseover', (event) => {
  document.getElementById("controls-container").classList.remove('hide');
  document.getElementById("controls-container").classList.add('show');
})

document.getElementById("panel").addEventListener('mouseout', (event) => {
  document.getElementById("controls-container").classList.remove('show');
  document.getElementById("controls-container").classList.add('hide');
})
