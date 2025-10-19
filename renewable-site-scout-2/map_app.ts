/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This file defines the main `renewable-scout-app` LitElement component.
 * This component is responsible for:
 * - Rendering the entire user interface: sidebar, main chat panel, interactive map,
 *   and message composer.
 * - Managing application state, including conversation history, active chat,
 *   loading status, and user input.
 * - Persisting conversations to localStorage.
 * - Handling user interactions like sending messages, starting new chats,
 *   selecting conversations, and getting coordinates from the map.
 * - Displaying chat messages, including special "Insight Cards" for NASA data.
 * - Interacting with the Google Maps JavaScript API to load and control the map.
 */

import {Loader} from '@googlemaps/js-api-loader';
import hljs from 'highlight.js';
import {html, LitElement, PropertyValueMap} from 'lit';
import {customElement, query, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {Marked} from 'marked';
import {markedHighlight} from 'marked-highlight';
import {NasaPowerData} from './mcp_maps_server';

export const marked = new Marked(
  markedHighlight({
    async: false, // Set to false since hljs is synchronous
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, {language}).value;
    },
  }),
);

// This key is for the Google Photorealistic 3D Maps API.
// IMPORTANT: Replace with your actual Google Maps API key.
const USER_PROVIDED_GOOGLE_MAPS_API_KEY: string =
  'AIzaSyAJPTwj4S8isr4b-3NtqVSxk450IAS1lOQ'; // <-- REPLACE THIS WITH YOUR ACTUAL API KEY

export interface Message {
  role: 'user' | 'assistant' | 'error';
  text: string;
  insightData?: NasaPowerData;
  id: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

@customElement('gdm-map-app')
export class MapApp extends LitElement {
  @query('#mapContainer') mapContainerElement?: HTMLElement;
  @query('#messageInput') messageInputElement?: HTMLTextAreaElement;
  @query('.chat-messages') chatMessagesElement?: HTMLDivElement;

  @state() conversations: {[id: string]: Conversation} = {};
  @state() activeConversationId: string | null = null;
  @state() isLoading = false;
  @state() composerText = '';
  @state() selectedCoords: {lat: number; lng: number} | null = null;
  @state() mapError = '';

  private map?: any;
  private mapClickListener?: any;
  private locationMarker?: any;
  private Marker3DElement?: any;

  sendMessageHandler?: (message: string, conversation: Conversation) => void;

  constructor() {
    super();
    this.loadConversations();
    if (!this.activeConversationId || !this.conversations[this.activeConversationId]) {
      this.startNewConversation();
    }
  }

  createRenderRoot() {
    return this;
  }

  protected firstUpdated() {
    this.loadMap();
    this.adjustTextareaHeight();
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (changedProperties.has('activeConversationId')) {
        this.scrollToBottom();
    }
  }

  // --- Map Methods ---

  async loadMap() {
    if (USER_PROVIDED_GOOGLE_MAPS_API_KEY.startsWith('AIza') === false) {
      this.mapError = `Please provide a valid Google Maps API Key in map_app.ts`;
      return;
    }

    const loader = new Loader({
      apiKey: USER_PROVIDED_GOOGLE_MAPS_API_KEY,
      version: 'beta',
    });

    try {
      // FIX: The `load()` method is deprecated/removed in newer versions of the loader.
      // Use `importLibrary()` to load the necessary libraries instead.
      await loader.importLibrary('geocoding');
      const maps3dLibrary = await (window as any).google.maps.importLibrary('maps3d');
      this.Marker3DElement = maps3dLibrary.Marker3DElement;
      this.initializeMap();
    } catch (error) {
      console.error('Error loading Google Maps API:', error);
      this.mapError = 'Could not load Google Maps. Check the console and ensure your API key is valid.';
    }
  }

  initializeMap() {
    if (!this.mapContainerElement) return;
    this.map = this.mapContainerElement;
    // Fix: Use the 'gmp-click' event and get coordinates from `e.detail.latLng`.
    this.mapClickListener = this.map.addEventListener('gmp-click', (e: any) => {
        if (!e.detail?.latLng) return;
        const {latitude, longitude} = e.detail.latLng;
        this.selectedCoords = {lat: latitude, lng: longitude};
        this.updateLocationMarker();
        this.composerText = `Is the location at Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} good for a solar farm?`;
        this.adjustTextareaHeight();
    });
  }

  updateLocationMarker() {
      if (!this.map || !this.Marker3DElement || !this.selectedCoords) return;

      if (this.locationMarker) {
          this.locationMarker.position = { ...this.selectedCoords, altitude: 100 };
      } else {
          this.locationMarker = new this.Marker3DElement();
          this.locationMarker.position = { ...this.selectedCoords, altitude: 100 };
          this.map.appendChild(this.locationMarker);
      }
      this.map.flyCameraTo({
          endCamera: {
            center: {...this.selectedCoords, altitude: 0},
            range: 5000,
            tilt: 60,
            heading: 0
          },
          durationMillis: 1500,
      });
  }

  // --- State and Conversation Management ---

  loadConversations() {
    const saved = localStorage.getItem('renewable-scout-conversations');
    const savedActiveId = localStorage.getItem('renewable-scout-active-id');
    if (saved) {
      this.conversations = JSON.parse(saved);
    }
    if (savedActiveId && this.conversations[savedActiveId]) {
      this.activeConversationId = savedActiveId;
    }
  }

  saveConversations() {
    localStorage.setItem('renewable-scout-conversations', JSON.stringify(this.conversations));
    localStorage.setItem('renewable-scout-active-id', this.activeConversationId || '');
  }

  startNewConversation() {
    const newId = `conv_${Date.now()}`;
    this.conversations = {
      ...this.conversations,
      [newId]: {
        id: newId,
        title: 'New Conversation',
        messages: [],
      },
    };
    this.activeConversationId = newId;
    this.saveConversations();
  }

  setActiveConversation(id: string) {
    this.activeConversationId = id;
    this.saveConversations();
  }

  getActiveConversation(): Conversation | null {
    return this.activeConversationId ? this.conversations[this.activeConversationId] : null;
  }

  public addMessage(message: Omit<Message, 'id'>) {
      const activeConv = this.getActiveConversation();
      if (!activeConv || !this.activeConversationId) return;
      const newMessage: Message = { ...message, id: `msg_${Date.now()}` };
      const updatedConversation = {
        ...activeConv,
        messages: [...activeConv.messages, newMessage],
      };
      this.conversations = {
        ...this.conversations,
        [this.activeConversationId]: updatedConversation,
      };
      this.saveConversations();
      this.scrollToBottom();
  }

  public streamToLatestMessage(chunk: string, insightData?: NasaPowerData) {
      const activeConv = this.getActiveConversation();
      if (!activeConv || activeConv.messages.length === 0 || !this.activeConversationId) return;
      
      const lastMessageIndex = activeConv.messages.length - 1;
      const lastMessage = activeConv.messages[lastMessageIndex];
      
      if (lastMessage.role === 'assistant') {
          const updatedMessage = {
              ...lastMessage,
              text: lastMessage.text + chunk,
              insightData: insightData ?? lastMessage.insightData,
          };
          
          const updatedMessages = [...activeConv.messages];
          updatedMessages[lastMessageIndex] = updatedMessage;

          const updatedConversation = {
            ...activeConv,
            messages: updatedMessages,
          };

          this.conversations = {
            ...this.conversations,
            [this.activeConversationId]: updatedConversation,
          };
          this.saveConversations();
          this.scrollToBottom();
      }
  }

  public setLoading(isLoading: boolean) {
      this.isLoading = isLoading;
  }

  public updateConversationTitle(id: string, title: string) {
      if(this.conversations[id]) {
          const updatedConversation = { ...this.conversations[id], title };
          this.conversations = {
            ...this.conversations,
            [id]: updatedConversation,
          };
          this.saveConversations();
      }
  }

  // --- UI Handlers ---

  handleSendMessage() {
    const text = this.composerText.trim();
    if (!text || this.isLoading) return;
    const activeConv = this.getActiveConversation();
    if (!activeConv) return;

    this.addMessage({role: 'user', text});

    if (this.sendMessageHandler) {
      this.sendMessageHandler(text, this.getActiveConversation()!);
    }
    this.composerText = '';
    this.adjustTextareaHeight();
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  }

  handleUseLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {latitude, longitude} = position.coords;
        this.selectedCoords = {lat: latitude, lng: longitude};
        this.updateLocationMarker();
        this.composerText = `Is the location at Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} good for a solar farm?`;
        this.adjustTextareaHeight();
      },
      (error: GeolocationPositionError) => {
        console.error(`Geolocation error (${error.code}): ${error.message}`);
        let userMessage: string;
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            userMessage = 'Geolocation permission denied. Please enable location services in your browser settings.';
            break;
          case 2: // POSITION_UNAVAILABLE
            userMessage = 'Location information is currently unavailable.';
            break;
          case 3: // TIMEOUT
            userMessage = 'The request to get your location timed out.';
            break;
          default:
            userMessage = 'An unknown error occurred while trying to get your location.';
            break;
        }
        alert(userMessage);
      },
    );
  }

  scrollToBottom() {
      requestAnimationFrame(() => {
          this.chatMessagesElement?.scrollTo({
              top: this.chatMessagesElement.scrollHeight,
              behavior: 'smooth'
          });
      });
  }

  adjustTextareaHeight() {
      if (this.messageInputElement) {
        this.messageInputElement.style.height = 'auto';
        this.messageInputElement.style.height = `${this.messageInputElement.scrollHeight}px`;
      }
  }

  // --- Render Methods ---

  render() {
    const activeConv = this.getActiveConversation();
    const sortedConversations = Object.values(this.conversations).sort((a, b) => parseInt(b.id.split('_')[1]) - parseInt(a.id.split('_')[1]));

    return html`
    <div class="renewable-scout-app">
        <aside class="sidebar">
            <div class="sidebar-header">
                <h1>Site Scout</h1>
                <button class="new-chat-btn" @click=${this.startNewConversation}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                </button>
            </div>
            <div class="conversation-list">
                ${sortedConversations.map(conv => html`
                    <div
                        class="conversation-item ${classMap({active: conv.id === this.activeConversationId})}"
                        @click=${() => this.setActiveConversation(conv.id)}
                    >
                        ${conv.title}
                    </div>
                `)}
            </div>
        </aside>

        <main class="main-content">
            <div class="chat-and-map-container">
                <header class="main-header">
                  <div class="title">${activeConv?.title ?? 'Chat'}</div>
                </header>
                <div class="chat-map-split">
                  <div class="chat-container">
                      <div class="chat-messages">
                          ${activeConv?.messages.map(msg => this.renderMessage(msg))}
                          <div id="anchor"></div>
                      </div>
                      ${this.isLoading ? this.renderLoadingIndicator() : ''}
                      <div class="composer-container">
                          <div class="composer">
                            <textarea
                              id="messageInput"
                              rows="1"
                              .value=${this.composerText}
                              @input=${(e: InputEvent) => {
                                  this.composerText = (e.target as HTMLTextAreaElement).value;
                                  this.adjustTextareaHeight();
                              }}
                              @keydown=${this.handleKeyDown}
                              placeholder="Ask about a location's renewable energy potential..."
                            ></textarea>
                            <div class="composer-buttons">
                                <button class="composer-btn" @click=${this.handleUseLocation} title="Use my current location">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 400q-151-138-225.5-288.5T180-640q0-125 87.5-212.5T480-940q125 0 212.5 87.5T780-640q0 150-74.5 300.5T480-80Z"/></svg>
                                </button>
                                <button class="composer-btn" @click=${this.handleSendMessage} ?disabled=${this.isLoading || !this.composerText.trim()}>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z"/></svg>
                                </button>
                            </div>
                          </div>
                      </div>
                  </div>
                  <div class="map-container">
                     ${this.mapError ? html`<div class="map-error-message">${this.mapError}</div>` : ''}
                     <gmp-map-3d
                        id="mapContainer"
                        center="0,0,100"
                        range="20000000"
                        tilt="0"
                        heading="0"
                        mode="hybrid"
                        internal-usage-attribution-ids="gmp_aistudio_threedmapjsmcp_v0.1_showcase_renewablescout"
                        default-ui-hidden="true"
                        role="application"
                      >
                      </gmp-map-3d>
                  </div>
                </div>
            </div>
        </main>
    </div>`;
  }

  renderMessage(msg: Message) {
    // We can now safely call parse synchronously.
    const renderedText = marked.parse(msg.text || '') as string;
    return html`
        <div class="turn role-${msg.role}">
            <div class="message-bubble">${
              // This is a bit of a hack to render the HTML string
              // In a real app, use a directive like lit-html-html
              // or sanitize the HTML carefully.
              (() => {
                const container = document.createElement('div');
                container.innerHTML = renderedText;
                return container;
              })()
            }</div>
            ${msg.insightData ? this.renderInsightCard(msg.insightData) : ''}
        </div>
    `;
  }

  renderLoadingIndicator() {
      return html`
        <div class="loading-indicator">
          <span>Scout is thinking</span>
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
  }

  renderInsightCard(data: NasaPowerData) {
    const { ghi, wind, temp, precip } = data.stats;
    return html`
    <div class="insight-card">
      <div class="insight-card-header">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160Zm0-80h640v-560H160v560Z"/></svg>
        <h3>NASA POWER Data Summary</h3>
      </div>
      <div class="insight-card-body">
        ${ghi ? html`
          <div class="metric-item">
            <span class="metric-label">Solar Irradiance (GHI)</span>
            <span class="metric-value">${ghi.avg.toFixed(2)}<span class="metric-unit">kWh/m²/day</span></span>
            <span class="metric-description">Avg. daily energy from the sun.</span>
          </div>
        ` : ''}
        ${wind ? html`
          <div class="metric-item">
            <span class="metric-label">Wind Speed (10m)</span>
            <span class="metric-value">${wind.avg.toFixed(2)}<span class="metric-unit">m/s</span></span>
            <span class="metric-description">Avg. wind speed 10m above ground.</span>
          </div>
        ` : ''}
        ${temp ? html`
          <div class="metric-item">
            <span class="metric-label">Air Temperature</span>
            <span class="metric-value">${temp.avg.toFixed(1)}°C</span>
            <span class="metric-description">Avg. with min: ${temp.min.toFixed(1)}° / max: ${temp.max.toFixed(1)}°</span>
          </div>
        ` : ''}
        ${precip ? html`
          <div class="metric-item">
            <span class="metric-label">Precipitation</span>
            <span class="metric-value">${precip.avg.toFixed(1)}<span class="metric-unit">mm/day</span></span>
            <span class="metric-description">Avg. daily rainfall equivalent.</span>
          </div>
        ` : ''}
      </div>
    </div>
    `;
  }
}
