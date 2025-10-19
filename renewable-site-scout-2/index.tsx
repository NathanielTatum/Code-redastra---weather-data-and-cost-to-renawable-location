/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This is the main entry point for the "Renewable Site Scout" application.
 * It sets up the LitElement-based UI, initializes the Google GenAI client
 * for chat and tool use, and manages the conversation flow. It contains the
 * core logic for the tool-calling loop: sending user messages to Gemini,
 * handling tool call requests by fetching data from the NASA POWER API,
 * sending the data back to Gemini, and streaming the final response to the UI.
 */

import {Chat, FunctionCall, GoogleGenAI, Tool, Type} from '@google/genai';
import {MapApp, Message, Conversation} from './map_app';
import {fetchNasaPowerData, NasaPowerData} from './mcp_maps_server';

const SYSTEM_INSTRUCTIONS = `**Role:**
You are *Renewable Site Scout*, an AI energy analyst that helps corporations and renewable developers find optimal locations for renewable energy projects using NASA POWER climate data.
You are connected to tools that can:

* **Geocode**: convert city or region names into latitude and longitude.
* **Fetch climate metrics** from NASA POWER (solar irradiance, temperature, wind speed, precipitation).

**Your goal:**
Use climate and environmental data to evaluate whether a site is suitable for renewable energy generation — especially **solar** or **wind** — and summarize the findings in clear, business-friendly language.

---

### 💬 **Behavior Rules**

1. If the user provides a **city, region, or place name**, call the \`get_power_data\` tool with the field \`"location"\` set to that name.

   * The backend will handle geocoding.
   * Do **not** ask for coordinates unless the geocoding fails.
2. If the user gives **coordinates**, use them directly.
3. Prefer **data-driven** insights over speculation — show average values and a short interpretation.
4. For every result, include a “**Summary for Decision-Makers**” section with a quick qualitative rating:

   * 🌞 **Solar Potential:** High / Moderate / Low
   * 🌬️ **Wind Potential:** High / Moderate / Low
   * Note relevant risks or uncertainty (e.g., precipitation, variability).
5. Keep the tone analytical but accessible — short sentences, professional tone, avoid technical jargon unless asked.
6. When comparing multiple sites, highlight differences in resource strength and reliability.

---

### ⚙️ **Tool Schema Awareness**

You have access to one primary tool:

#### \`get_power_data\`

Fetches NASA POWER daily or climatology data for a given location or coordinates.

**Parameters:**

\`\`\`json
{
  "location": "optional text (city, region, or place name)",
  "latitude": "optional number",
  "longitude": "optional number",
  "start": "optional YYYYMMDD or YYYYMM",
  "end": "optional YYYYMMDD or YYYYMM"
}
\`\`\`

---

### 🧾 **Output Format Example**

\`\`\`
**Location:** Sugar Land, Texas, USA  
**Coordinates:** 29.62°N, -95.63°W  

**Key Climate Data (NASA POWER):**
- Avg Solar Irradiance (GHI): 5.3 kWh/m²/day  
- Avg Wind Speed (10m): 4.6 m/s  
- Avg Air Temp: 23.2°C  
- Avg Precipitation: 2.1 mm/day  

**Summary for Decision-Makers:**
🌞 Solar Potential: High — strong irradiance and consistent sunlight.  
🌬️ Wind Potential: Moderate — viable for smaller-scale projects.  
💧 Risk Note: Seasonal rainfall may affect maintenance windows.  
\`\`\`
`;

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

const getPowerDataTool: Tool = {
  functionDeclarations: [
    {
      name: 'get_power_data',
      description: 'Fetches NASA POWER daily data (solar, wind, temp, precipitation) for a location. Provide either a location name for geocoding, or explicit latitude and longitude coordinates.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          location: {
            type: Type.STRING,
            description: 'The name of the location (e.g., "Paris, France", "Sahara Desert"). Use this if latitude and longitude are not provided.',
          },
          latitude: {
            type: Type.NUMBER,
            description: 'Latitude for the location. Use this if a location name is not provided.',
          },
          longitude: {
            type: Type.NUMBER,
            description: 'Longitude for the location. Use this if a location name is not provided.',
          },
          start: {
            type: Type.STRING,
            description: "Optional start date in YYYYMMDD format. If not provided, defaults to the beginning of the previous full calendar year.",
          },
          end: {
            type: Type.STRING,
            description: "Optional end date in YYYYMMDD format. If not provided, defaults to the end of the previous full calendar year.",
          },
        },
      },
    },
  ],
};

async function geocodeLocation(locationName: string): Promise<{lat: number, lng: number}> {
  return new Promise((resolve, reject) => {
    // The Google Maps script is loaded in map_app.ts, so window.google should be available.
    if (!(window as any).google || !(window as any).google.maps) {
        return reject(new Error('Google Maps API not loaded.'));
    }
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address: locationName }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        reject(new Error(`Geocoding failed for "${locationName}". Reason: ${status}`));
      }
    });
  });
}

async function runConversation(mapApp: MapApp, history: Message[], userMessage: string) {
  mapApp.setLoading(true);

  const sdkHistory = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: sdkHistory,
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS,
      tools: [getPowerDataTool],
    },
  });


  try {
    const stream = await chat.sendMessageStream({
      message: userMessage,
    });

    let text = '';
    let functionCall: FunctionCall | undefined;

    // Process the stream to aggregate text and find the function call.
    for await (const chunk of stream) {
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) {
            text += part.text;
            mapApp.streamToLatestMessage(part.text);
          } else if (part.functionCall) {
            // The API sends the full function call in a single chunk.
            // We'll just take the first one we see.
            if (!functionCall) {
              functionCall = part.functionCall;
            }
          }
        }
      }
    }

    // If a function call was received, execute it and send the response back.
    if (functionCall) {
        const {location, latitude, longitude, start, end} = functionCall.args as {
            location?: string;
            latitude?: number;
            longitude?: number;
            start?: string;
            end?: string;
        };
        
        try {
            let lat: number;
            let lon: number;

            if (location) {
                const coords = await geocodeLocation(location);
                lat = coords.lat;
                lon = coords.lng;
                mapApp.streamToLatestMessage(`\n> _Geocoded "${location}" to ${lat.toFixed(4)}, ${lon.toFixed(4)}._\n`);
            } else if (latitude !== undefined && longitude !== undefined) {
                lat = latitude;
                lon = longitude;
            } else {
                throw new Error("Please provide either a location name or latitude/longitude coordinates for the `get_power_data` tool.");
            }
            
            // Default dates if not provided, using last full year
            let startDate = start;
            let endDate = end;
            if (!startDate || !endDate) {
                const lastYear = new Date().getFullYear() - 1;
                startDate = `${lastYear}0101`;
                endDate = `${lastYear}1231`;
            }
            
            const insightData = await fetchNasaPowerData({
                latitude: lat, longitude: lon, start: startDate, end: endDate
            });
            mapApp.streamToLatestMessage('', insightData);
          
            const functionResponseStream = await chat.sendMessageStream({
                message: [
                  {
                      functionResponse: {
                          name: functionCall.name,
                          response: {
                            ...insightData.stats,
                            location: location || `${lat.toFixed(2)}, ${lon.toFixed(2)}`
                          },
                      }
                  }
                ]
            });

            // Process the final response stream by iterating through parts
            for await (const finalChunk of functionResponseStream) {
                if (finalChunk.candidates?.[0]?.content?.parts) {
                    for (const part of finalChunk.candidates[0].content.parts) {
                        if (part.text) {
                            text += part.text;
                            mapApp.streamToLatestMessage(part.text);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            mapApp.addMessage({role: 'error', text: `Sorry, there was a problem: ${errorMessage}`});
        }
    }


    if (history.length === 0 && text.length > 0) {
        const titleResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a short, concise title (4 words max) for the following conversation:\n\nUser: ${userMessage}\nAssistant: ${text}`
        });
        mapApp.updateConversationTitle(mapApp.getActiveConversation()!.id, titleResponse.text.replace(/"/g, ''));
    }

  } catch (e) {
    console.error(e);
    mapApp.addMessage({role: 'error', text: 'An error occurred. Please try again.'});
  } finally {
    mapApp.setLoading(false);
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  const rootElement = document.querySelector('#root')! as HTMLElement;
  const mapApp = new MapApp();
  rootElement.appendChild(mapApp as unknown as HTMLElement);

  mapApp.sendMessageHandler = async (message: string, conversation: Conversation) => {
    mapApp.addMessage({role: 'assistant', text: ''});
    await runConversation(mapApp, conversation.messages.slice(0, -2), message);
  };
});