import {answerQuestion} from './crew-chat-answers.mjs?v=page-chat-v3';

const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-question');
const send = document.querySelector('#chat-send');
const messages = document.querySelector('#messages');
const conversation = document.querySelector('#conversation');
const context = {};

function syncInput() {
  send.disabled = !input.value.trim();
  input.style.height = '44px';
  input.style.height = `${Math.min(110, Math.max(44, input.scrollHeight))}px`;
}
function ask(question) {
  const text = question.trim().slice(0,500);
  if (!text) return;
  messages.querySelectorAll('.followups').forEach(el => el.remove());
  const user = document.createElement('div');
  user.className = 'message message-user';
  user.setAttribute('aria-label', 'You');
  user.textContent = text;
  messages.append(user);

  const reply = document.createElement('div');
  reply.className = 'message message-assistant';
  const speaker = document.createElement('span');
  speaker.className = 'speaker';
  speaker.textContent = '✦ MARVEL';
  reply.append(speaker);
  const result = answerQuestion(text, context);
  context.lastTopic = result.id;
  reply.dataset.topic = result.id;
  for (const paragraph of result.answer) {
    const p = document.createElement('p');
    p.textContent = paragraph;
    reply.append(p);
  }
  const followups = document.createElement('div');
  followups.className = 'followups';
  followups.setAttribute('aria-label', 'Follow-up questions');
  for (const question of result.next) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.question = question;
    button.textContent = question;
    followups.append(button);
  }
  reply.append(followups);
  if (result.action) {
    const link = document.createElement('a');
    link.className = 'chat-action';
    link.textContent = result.action.label + ' ↗';
    link.href = result.action.href;
    link.target = '_top';
    reply.append(link);
  }
  messages.append(reply);
  // Keep only the last 20 turns in memory. No chat text leaves the browser.
  while (messages.children.length > 40) messages.firstElementChild.remove();
  input.value = '';
  syncInput();
  // Scroll only this phone's conversation, never the host site's timeline.
  requestAnimationFrame(() => {
    conversation.scrollTop += user.getBoundingClientRect().top - conversation.getBoundingClientRect().top - 12;
  });
}
form.addEventListener('submit', event => {event.preventDefault(); ask(input.value);});
input.addEventListener('input', syncInput);
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    ask(input.value);
  }
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-question]');
  if (button) ask(button.dataset.question);
});
function close() {
  if (window.parent !== window) window.parent.postMessage({type:'marvel-chat:close'}, location.origin);
  else location.href = './#app';
}
document.querySelector('#chat-back').addEventListener('click', close);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {event.preventDefault();close();}
});
