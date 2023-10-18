const express = require ('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const WebSocket = require('ws');
const {v4 : uuidV4} = require('uuid');

const direciones = [] //Aqui se guarda la direcion Ip de los peers que se conecten 
const usuario = [] //Aqui se guarda el id de todos los peers que se conecten al servidor
const Lisocket =[] //Aqui se guardan los sockect tipo io
const administradores = []//Guardamos los websocket que comunican al servidor como a los que se conectan en la const cliente de abajo
const cliente = []
const mensaje = {// Este es el mensaje que enivamos entre servidores cuando se conecta o desconecta un Id
    ban: 0,
    mensaje: ""
  }
var admin
app.set('view engine','ejs')
app.use(express.static('public'))
app.get('/',(req,res) =>{
    res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req,res) =>{
    res.render('room', { roomId: req.params.room })
})

//Esta funcion escucha cada vez que un nuevo peer se conectar al servidor y al hacerlo registrar su Id y su socket esto lo hace para
//si conecta un nuevo peer, este nuevo peer tenga los Id de los anteriores peer que se conectaron
io.on('connection', socket =>{
    
    Lisocket.push(socket)//Guardamos los sockect de conexion con cada peer
    usuario.forEach(Element => socket.emit('user2-connected', Element))//Y emitimos este evento para que el nuevo peer tenga los Id de los peers anteriores
    
    var ip = socket.conn.remoteAddress;
    var ip2 = ip.substring(7,20)
    let include = direciones.includes(ip2)
    /*/Este if verifica cada vez que se conecta un nuevo usurio, si el nuevo usuario tiene una dirrecion IP que no hubiese registrado antes
    se guardara su direccion y creara la conexion con el servidor que este en esa IP*/
    if(include == false && ip2 !='' && ip2 !='127.0.0.1'){ 
        var conetado = 'ws://'+ip2+":3001"
        var wsC = new WebSocket(conetado);
        
        direciones.push(ip2)
        console.log(direciones)
        administradores.push(wsC)//guarda el socket que cominica con los demas sevidores
                /*Abrimos la conexion con el servidor remoto y le enviamos todos los Id que tengamos registrados en este servidor y se los envimos en un objecto
                JSON que contega el Id y una bandera que identifique el tipo de mensaje(en caso de ser 1 quiere decir que es un nuevo peer o un nuevo Id a registrar)
                y se lo enviamos */
                wsC.on('open', function open() {
                    usuario.forEach(Element=>{
                    mensaje.ban = 1
                    mensaje.mensaje = Element 
                    wsC.send(JSON.stringify(mensaje));
                    })
                });
                /*Este eveneto escucha los mensajes que estara enviando el servido cada vez que se desconecta o conecta un peer, este recibe un objecto JSON
                que contiene una bandera y el Id del peer, en caso de que la bandera sea 1 quiere decir que es un peer nuevo del cual se debe registrar sus Id
                si es 2 querie decir que el peer se desconecto 
                */
                wsC.on('message', function incoming(data) {
                var nuevo2 = JSON.parse(data)
                    if(nuevo2.ban == 1){
                        let include = usuario.includes(nuevo2.mensaje)
                        if(include == false ){
                        usuario.push(nuevo2.mensaje)        
                        }
                        usuario.push(nuevo2.mensaje)
                        //Registra al nuevo usurio que ingreso por otro servidor
                        Lisocket.forEach(Element=>{                    
                        Element.emit('user2-connected', nuevo2.mensaje)
                        })
                    }
                    if(nuevo2.ban == 2){
                        Lisocket.forEach(Element=>{
                            //Notifica en los peer conectado en el servidor que un peer en otro servidor se desconecto
                            Element.emit('user-disconnected', nuevo2.mensaje)
                        })
                    }
                });
                
                //Este evento espera a que el servidor se ciere y de se asi borrar el sockect que conectaba con ese servior
                wsC.on('close', error =>{
                    console.log(error, 'Se desconecto el servidor')
                    var i =administradores.indexOf(wsC)
                    administradores.splice(i,1)
                })
    }

    socket.emit('nuevo')
    //Este evento escucha de los peer quien es el nuevo administrado eligido por ellos mismos y guarda su Id por seperado
    socket.on('nuevo_admin', nuevaUs =>{   
        admin = nuevaUs
        console.log('El nuevo admin es:',admin)
    })
    
   
    //Este evento escuha cuando un nuevo usuario o nuevo peer se conecta al servidor de esta menera los peers que ya estaban conectado concen del nuevo peer que se acaba de conectar
    socket.on('join-room',(roomId,userId)=>{
        var c = direciones.length 
        //Este if esta para identificar si hay 1 o mas de servidor conectado, si los hay lo que hara es enviarle mediante los sokcetes que guradamos de los servidores los nuevos Id que se registraron
        if( c > 1 || c == 1){
            cliente.forEach( ele =>{
                mensaje.ban = 1
                mensaje.mensaje = userId
                ele.send(JSON.stringify(mensaje))
            })
            
            administradores.forEach( ele =>{
                mensaje.ban = 1
                mensaje.mensaje = userId
                ele.send(JSON.stringify(mensaje))
            })
        }
        //Este sirve para guardar el la cadena usuario el Id de cada peer conectado en todos los servidores(solo registra una unica vez ese Id para se utiliz el if)
        let includein = usuario.includes(userId)
        if(includein == false ){
        usuario.push(userId)        
        } 
        
        
        console.log(roomId,userId)
        socket.join(roomId)
        //Este evento se vuelve a emitir para que los peers tengan el Id del nuevo peer(este evento se emite dos veces por cosas de sincronziscion ya que puede dar errores)
        usuario.forEach(Element => socket.to(roomId).emit('user2-connected', Element))
        //Este evento escucha cada vez que un peer se desconecta del servidor
        socket.on('disconnect', () => {
            //Elimina el Id del servidor y le emite a los demas peers un evento que les indica que un peer se desconecto
            var i =usuario.indexOf(userId)
            usuario.splice(i,1)
            socket.to(roomId).emit('user-disconnected', userId)
            //Este if sirve para identifica si existe mas de un servidor que le notifique que un peer se acaba de desconectar para esto lo indica el valor de la bandera 2
            if( c > 1 || c == 1){
                mensaje.ban = 2
                mensaje.mensaje = userId
                administradores.forEach( ele =>{
                    ele.send(JSON.stringify(mensaje))
                })
                cliente.forEach( ele =>{
                    ele.send(JSON.stringify(mensaje))
                })
            }
          })
      
    })

    
})
//Este sirve para poner el servidor ws o wensocket en marcha para que escuche cualquier otro servidor que se quiera conectar
const wss = new WebSocket.Server({ port: 3001 });
//Este evento escucha cada vez que un nuevo servidor ws se conecta
wss.on('connection', function connection(ws) {
    var ip2 = ws._socket.remoteAddress.substring(7,20)
    let include = direciones.includes(ip2)
    //Guarda la Ip de cada servidor que se conecta
    if(include == false && ip2 != '' && ip2 !='127.0.0.1'){
        direciones.push(ip2)
    }
    //guarda el sockect de lo servidores que conectan
    cliente.push(ws)
    
    //Este evento recibe los mensajes de los servidores que se desconectan
    ws.on('message', function incoming(message) {
    var nuevo = JSON.parse(message)
        //Al igual que en la parte de arriba este servidor espera un mensaje tipo JSON que contega una bandera que señalda el tipo de mensaje y el Id
        //!Importante! cuando se conectan lo servidor cada 1 se envia mutuamente los Id que tenga conectados de esa forma siempre saben que Id ya estaban conectado antes de unirse, para ambos caso se envian con la bandera 1
        //si la bandera es 1 quiere decir que un nuevo usuario se gistro en otro servidor
        if( nuevo.ban == 1){
        //comprueba si el nuevo Id ya lo tiene registrao
        let include = usuario.includes(nuevo.mensaje)
        if(include == false ){
        usuario.push(nuevo.mensaje)// si no lo tiene registrado lo ingresa en la cadena usurios        
        }    
       
        Lisocket.forEach(Element=>{
            Element.emit('user2-connected', nuevo.mensaje)//Emite un evento a los peers conectado en el servidor para que conoscan a lo peer conectados en otro servidor
        })
        //Eniva de regresos al servidor que se conecto los peer registrados en este servidor
        usuario.forEach(Element=>{
            mensaje.ban = 1
            mensaje.mensaje = Element
            ws.send(JSON.stringify(mensaje));
        })
        }
        
        //Si la bandera es 2 quiere decir que un usuario de deconecto en otro servidor y hay que eliminarlo
    if(nuevo.ban == 2){
        let i = usuario.indexOf(nuevo.mensaje)
        usuario.splice(i,1)
        //Emite a cada peer conectado que se desconecto un usuario
        Lisocket.forEach(Element=>{    
            Element.emit('user-disconnected', nuevo.mensaje)
        })
    }
    });
    //Espera cuando un servidor se desconecta
    ws.on('close', ()=>{
        console.log('Se desconeto el otro cliente')
        var i = cliente.indexOf(ws)
        administradores.splice(i,1)
    })

});

server.listen(3000)

