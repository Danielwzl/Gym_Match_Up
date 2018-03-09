  $(function () {

      // initialize semanticUI components

      $('.ui.menu .ui.dropdown').dropdown({
          on: 'hover'
      });

      $('.ui.menu a.item')
          .on('click', function () {
              $(this).addClass('active')
                  .siblings()
                  .removeClass('active');
          });

      $('#mainMenu i').popup({
          delay: {
              show: 1000
          }
      });

      $('.chats.circular.wizard.icon')
          .popup({
              popup: $('.chats .noselect.popup'),
              position: 'right center',
              on: 'click'
          });

      $('.chats.circular.smile.icon')
          .popup({
              popup: $('.emoji.popup'),
              on: 'click'
          });

      $('.chats.circular.image.icon')
          .popup({
              popup: $('.imgloader.popup'),
              on: 'click'
          });

      $('.menu .item').tab();

      $('.event.example .image').dimmer({
          on: 'hover'
      });


      $('#artwork').on('click', function () {
          $('.ui.fullscreen.modal').modal('show');
      });

  });
