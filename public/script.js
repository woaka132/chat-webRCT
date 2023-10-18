const socket = io('/');
const myPeer = new Peer();

let message = document.getElementById('texto');
let texto = document.getElementById('mensajes');
let btn = document.getElementById('enviar');
let btn2 = document.getElementById('random');
let btn3 = document.getElementById('enviar_tiempo');
let nombreProc = document.getElementById('proceso');
let tiempo = document.getElementById('tiempo');

function eraseText() {
  document.getElementById("texto").value = "";
}

const peers = {}
//Este es un objecto llamado mensaje que nos ayuda a la comunicacion entre cada peer ya que solo pueden recibir mensajes hay que diferncia el tipo de mensaje para cada ocasion
const mensaje = {
  ban: 0, //Sirve para identificar el mensaje 
  mensaje: "",//Este es el mensaje que puede muestra en la pagina web en el textarea
  id: "",//El id de este peer
  myid: "",//El id de adminstrador
  adminid:"",
  conta: 0,//este tendra el valor de cuando este peer se conecto
  contaAd: 0,//el tendra el valor cuando se conecto el adminstrador(estos dos ultimos para el algorimos bully)
  nombreP: "",//nombreP,estado y tiempo son para el algoritmo anillado
  teimpo : 0,
  estado : false
}
var nodos = 1//Este variable guarda la cantida de peers conectados
dibujar_circulo(nodos ) //Funcion dibuja en un canvas la representacion de cada peer
const usuario = []//Guarda los Id de todos los peer
var soyAd = false//Sirve para identifacar si este peer es el adminstrado
var dia = new Date()//Guarda el numero de cuando se conecto el peer
mensaje.conta = dia.getTime() //Y gurda el valor anterior en conta y contaAd
mensaje.contaAd = mensaje.conta

//MENSAJES---Esta es la parte en como funciona la p2p atraves de puros mensajes/Una vez que tenemos el Id de todo los usuario conectados lo unico que tenemos que hacer es enviarle un
//con el tipo de informacion que queremos procesar
myPeer.on('connection', conn => {     
  conn.on('data', function (data) {
    //Si la bandera es 0 quiere decir que nos enviaron un mensaje de chat atraves de boton enviar y lo recibimos aqui lo imprimos en la pagina web
    if(data.ban == 0){
    
      let include = usuario.includes(data.id)
    if(include == false && data.id != mensaje.id){  
      usuario.push(data.id)
      console.log("Desconocido encontrado",data.id)
    }
    texto.textContent += data.mensaje + '\n'
    
    }
    //Si el mensaje es 1 quiere decir que el adminstrdor se deconecto cuando eso sucude todos los peers envian a todo los peers la variable con la hora que entrar
    //de esta forma todos comparan con todos quien es el mas viejo
    if(data.ban == 1){
      //data.conta es el valor que los demas peer enviaron y mensaje.conta es el propio valor
      if(data.conta < mensaje.conta && data.conta < mensaje.contaAd){
        //!iMPORTANTE! se compara y se guarda con contaAd porque que paso si primeor viene alguien que mas viejo que este peer pero no es el mas viejo entonces guarda este valor y si viene alguein que es mas viejo lo cambia y asi constamente
        mensaje.contaAd = data.conta
        mensaje.adminid = data.id
        console.log(data.id + "Es mas viejo que yo")
        //Se emite al servidor quien el adminsitrador
        socket.emit('nuevo_admin', data.id)
        //Envia un mensaje de regreso deciendlo que es el adminstrador
        mensaje.ban = 2
        var dd = myPeer.connect(data.id);
        dd.on('open', function() {
           dd.send(mensaje)
        })
        
      }
    }
     //Quiere decir que es mas viejo que otro peer pero no significa que sea el mas viejo
    if(data.ban == 2){
      soyAd = true
      console.log("Soy admin") 
    }
     //Este en un mensaje para colorear de color rojo los nodos que se encuentran ya ocupados
    if(data.ban == 3){
      let i = usuario.indexOf(data.mensaje)  
      dibujar_circulito(nodos,i+1)
    }
    //Este if verifica si el peer tiene disponible para procesar el proceso que envio algun peer
    if(data.ban == 4){
      mensaje.nombreP = data.nombreP
      mensaje.teimpo = data.teimpo
       //Este if comprueba si el peer esta disponible para hacer la peticion del otro peer
      if(mensaje.estado == false){
        mensaje.estado = true
        console.log('acepte al proceso', data.nombreP)
        dibujar_circulito(nodos, 0)
        usuario.forEach( elem =>{ 
          if(elem != data.id){
            mensaje.mensaje = mensaje.id
            mensaje.ban = 3
            var dd = myPeer.connect(elem);
            dd.on('open', function() {
              dd.send(mensaje)
           }) 
          }else{
            //Este regresa al peer que su solictud si puede ser procesada
            mensaje.ban = 5
            var dd2 = myPeer.connect(data.id);
            dd2.on('open', function() {
              dd2.send(mensaje)
           }) 
          }
        })
               
      }else{
        //Si no se encuentra disponible le envia de regreso un mensaje que inidca que este nodo no tiene disponibildiad para procesar la peticion que le acaba de enviar
        mensaje.ban = 6
        var dd = myPeer.connect(data.id);
        dd.on('open', function() {
           dd.send(mensaje)
        })
      }
    }
    //Cuando recibe este mensaje este mensaje quiere decir que el su proceso si pudo ser despachado por otro peer
    if(data.ban == 5){
      console.log(data.id + " acepto mi preceso")
      let i = usuario.indexOf(data.id)
      console.log(i+1)
      dibujar_circulito(nodos, i+1)
    }
    //Cuando recibe este mensaje quiere decir el nodo al que hizo la peticion no pudo realizar y le preguntara al sigueinte peer en su lista
    //que si esta disponible para ejecutar su peticion
    if(data.ban == 6){
      console.log(data.id + "no acepto mi preceso")
      mensaje.nombreP = data.nombreP
      mensaje.teimpo = data.teimpo
      let i = usuario.indexOf(data.id) 
      mensaje.ban = 4
      var conn = myPeer.connect(usuario[i + 1]);
      conn.on('open', function() {
         conn.send(mensaje)
      }) 
    }    
  })

});

socket.on('nuevo',()=>{
    mensaje.ban = 6
    mensaje.mensaje = mensaje.id
    usuario.forEach( userId =>{
      var conn = myPeer.connect(userId);
      conn.on('open', function() {
         conn.send(mensaje)
      })  
    })
})

socket.on('nuevo usuario', admin =>{
  console.log(admin)
  let include = usuario.includes(admin)
  if(include == false ){
    usuario.push(admin)
    mensaje.ban = 5
    mensaje.mensaje = mensaje.id
    var dd = myPeer.connect(admin);
        dd.on('open', function() {
           dd.send(mensaje)
        })
  }     
})


//Este evento sirve se encuentra constanmente esuchando cada vez que un nuevo peer se conecta al servidor 
socket.on('user2-connected', (Element) => {
  let include = usuario.includes(Element)
  if(include == false && Element != mensaje.myid){
    usuario.push(Element)
    nodos = nodos + 1
    dibujar_circulo(nodos)
    
    usuario.forEach( userId =>{
      mensaje.ban = 1
      mensaje.conta = dia.getTime()
      
      var conn = myPeer.connect(userId);
      conn.on('open', function() {
        // Send messages
         conn.send(mensaje)
      })  
    })

  }     
})

socket.on('disconnect', (reason) => {
  console.log(reason)
  socket.close()
});

btn.addEventListener('click', function () { 
  mensaje.ban = 0
  mensaje.mensaje = message.value
  texto.textContent += mensaje.mensaje + '\n'
  
  usuario.forEach( userId =>{
    var conn = myPeer.connect(userId);
    conn.on('open', function() {
      // Send messages
       conn.send(mensaje)
    })  
  })
});

btn3.addEventListener('click', function () { 
  mensaje.nombreP = nombreProc.value
  mensaje.teimpo = tiempo.value
  if(mensaje.estado === false){
    dibujar_circulito(nodos,0)
    mensaje.estado = true 
    mensaje.ban = 3
    mensaje.mensaje = mensaje.id
    
    usuario.forEach( userId =>{
      var conn = myPeer.connect(userId);
      conn.on('open', function() {
         conn.send(mensaje)
      })  
    }) 
  }else{
    let cuenta = usuario.length
    if(cuenta > 0){
      mensaje.ban = 4
      var conn = myPeer.connect(usuario[0]);
      conn.on('open', function() {
         conn.send(mensaje)
      }) 
    }else{
      console.log('No hay mas nodos conectados')
    }
  }
});

btn2.addEventListener('click', function () { 
nombre= "Proceso-"+generateRandomString(10) 
nombreProc.value = nombre
x = Math.floor(Math.random()*(45-15+1)+15)
tiempo.value = x
});

socket.on('user-disconnected', userId => {
  var i =usuario.indexOf(userId)
  usuario.splice(i,1)
  nodos = nodos - 1
  dibujar_circulo(nodos)
  //console.log(usuario)

  if( userId == mensaje.adminid ){
    console.log('El admin se desconecto')
    mensaje.adminid = mensaje.id
    dia = new Date()
    mensaje.contaAd = dia.getTime() 
    
    usuario.forEach( userId =>{
      mensaje.ban = 1
      var conn = myPeer.connect(userId);
      conn.on('open', function() {
         conn.send(mensaje)
      })  
    })
   
  }

  if (peers[userId]) 
  peers[userId].close()
})

myPeer.on('open', id => {
  mensaje.id = id
  mensaje.myid = id
  mensaje.adminid = id
  socket.emit('join-room', ROOM_ID, id)
})


function dibujar_circulo(n){
  var radio=150
  var cx = 200
  var cy = 200
  var f = Math.PI / n * 2
  var cv,ctx
  var squereSize = 20
  
  cv = document.getElementById('lienzo')
  ctx = cv.getContext('2d')

  ctx.beginPath();
  ctx.fillStyle = '#0077aa';
  ctx.strokeStyle = '#0077aa47';
  ctx.lineWidth = 2;
  ctx.arc(200,200, 180, 0, Math.PI * 2, 0)
  ctx.fill()

  ctx.beginPath();
  ctx.fillStyle = '#66ffff';
  ctx.strokeStyle = '#66ffff';
  ctx.lineWidth = 2;
  ctx.arc(200,200, 120, 0, Math.PI * 2, 0)
  ctx.fill()


  for(var i = 0; i<n; i++){
      var x = radio * Math.cos(i * f) + cx
      var y = radio * Math.sin(i * f) + cy
      ctx.beginPath();
      ctx.fillStyle = '#7f00ff';
      ctx.strokeStyle = '#7f00ff';
      ctx.lineWidth = 2;
      ctx.arc(x,y, squereSize, 0, Math.PI * 2, 0)
      ctx.fill()
  }
}

function dibujar_circulito(n,h){
  var radio=150
  var cx = 200
  var cy = 200
  var f = Math.PI / n * 2
  var cv,ctx
  var squereSize = 20
  
  cv = document.getElementById('lienzo')
  ctx = cv.getContext('2d')


      var x = radio * Math.cos(h * f) + cx
      var y = radio * Math.sin(h * f) + cy
      ctx.beginPath();
      ctx.fillStyle = '#EE2020';
      ctx.strokeStyle = '#EE2020';
      ctx.lineWidth = 2;
      ctx.arc(x,y, squereSize, 0, Math.PI * 2, 0)
      ctx.fill() 
}


const  generateRandomString = (num) => {
  const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result1= Math.random().toString(36).substring(3,num);       

  return result1;
}