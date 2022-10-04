const socket = io();
const form = document.querySelector('form');
const input = document.querySelector('#m');
const messages = document.querySelector('#messages');
const name = prompt('What is your name?');

console.log('hola socketdom');

function appendMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.innerText = message;
  messages.append(messageElement);
}

appendMessage('You joined');
socket.emit('new-user', name);
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = input.value;
  appendMessage(`You: ${message}`);
  socket.emit('send-chat-message', message);
  input.value = '';
});
socket.on('chat-message', (data) => {
  appendMessage(`${data.name}: ${data.message}`);
});
socket.on('user-connected', (name) => {
  appendMessage(`${name} connected`);
});
socket.on('user-disconnected', (name) => {
  appendMessage(`${name} disconnected`);
});
