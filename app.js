(function() {
  var beget = function(o) {
    var F = function() { }
    F.prototype = o
    return new F()
  }

  var createController = function(doc, movement, stats) {
    var self = {}

    var slides = doc.getElementsByTagName("section")
    var slideIndex = -1;

    var hideAll = function() {
      for (var i = 0; i < slides.length; i++) {
       slides[i].style.display = "none"
      }
    }

    var nextPage = function() {
      hideAll()
      slideIndex = (slideIndex + 1) % slides.length
      slides[slideIndex].style.display = "block"
    }

    var previousPage = function() {
     hideAll()
      slideIndex = (slideIndex + slides.length - 1) % slides.length
      slides[slideIndex].style.display = "block" 
    }

    var updateStats = function(stats) {
      doc.getElementById("stats1").innerText = stats
    }

    self.start = function() {
      movement.onPrevious(previousPage)
      movement.onNext(nextPage)
      stats.onUpdate(updateStats)
      nextPage()
    }

    return self
  }

  var createMovementAdapter = function() {
    var self = {}
    var previousListeners = []
    var nextListeners = []

    self.triggerPrevious = function() {
      previousListeners.forEach(function(listener) { listener() })
    }

    self.triggerNext = function() {
      nextListeners.forEach(function(listener) { listener() })
    }

    self.onPrevious = function(listener) {
      previousListeners.push(listener)
    }

    self.onNext = function(listener) {
      nextListeners.push(listener)
    }

    return self
  }

  var createWebSocketMovementAdapter = function(ws) {
    var self = beget(createMovementAdapter())
    
    self.connect = function() {
      ws.addEventListener("open", function() {
        ws.onmessage = function(event) {
          if (event.data == "previous") {
            self.triggerPrevious()
          } else if (event.data == "next") {
            self.triggerNext()
          }
        }
      })

      return self
    }


    return self
  }

  var createKeyboardMovementAdapter = function(win) {
    var self = beget(createMovementAdapter())

    self.connect = function() {
      window.addEventListener("keyup", function(event) {
        if (event.keyCode == 37) {
          self.triggerPrevious()
        } else if (event.keyCode == 39) {
          self.triggerNext()
        }
      })

      return self
    }

    return self
  }

  var createMovementMultiAdapter = function() {
    var self = {}
    var adapters = Array.prototype.slice.call(arguments)

    self.onPrevious = function(listener) {
      adapters.forEach(function(a) { a.onPrevious(listener) })
    }

    self.onNext = function(listener) {
      adapters.forEach(function(a) { a.onNext(listener) })
    }

    return self
  }

  var createMovementAnnouncer = function(ws, keyboardMovement) {
    var self = beget(keyboardMovement)

    self.connect = function() {
      ws.addEventListener("open", function() {
        self.onPrevious(function() {
          ws.send("previous")
        })

        self.onNext(function() {
          ws.send("next")
        })
      })

      return self
    }

    return self
  }

  var createStatsLoader = function(ws) {
    var self = {}
    var updateListeners = []

    self.onUpdate = function(listener) {
      updateListeners.push(listener)
    }

    self.connect = function() {
      ws.addEventListener("open", function() {
        ws.onmessage = function(event) {
          updateListeners.forEach(function(listener) { listener(event.data) })
        }
      })

      return self
    }

    return self
  }

  window.addEventListener("load", function() {
    var controlSocket = new WebSocket("ws://localhost:8765/")
    var statsSocket = new WebSocket("ws://localhost:9876/")
    var keyboardMovement = createKeyboardMovementAdapter(window).connect()
    var webSocketMovement = createWebSocketMovementAdapter(controlSocket).connect()
    var movementAnnouncer = createMovementAnnouncer(controlSocket, keyboardMovement).connect()
    var movementAdapter = createMovementMultiAdapter(webSocketMovement, movementAnnouncer)
    var statsLoader = createStatsLoader(statsSocket).connect()
    var controller = createController(document, movementAdapter, statsLoader)
    controller.start()
  })
}())