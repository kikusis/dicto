import { SummarizationConfig } from '../types';

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULT_PROMPT = `You are a meeting summarizer. Given the following meeting transcript, provide a clear and concise summary that includes:

1. **Meeting Overview**: A brief 2-3 sentence summary of the meeting.
2. **Key Discussion Points**: Bullet points of the main topics discussed.
3. **Action Items**: Any tasks, assignments, or follow-ups mentioned.
4. **Decisions Made**: Key decisions that were reached.
5. **Next Steps**: Any planned follow-ups or future meetings.

Keep the summary professional and actionable. Use markdown formatting.

---

TRANSCRIPT:
{transcript}`;

export async function summarizeTranscript(
  transcript: string,
  config: SummarizationConfig,
): Promise<string> {
  const apiUrl = config.apiUrl || DEFAULT_API_URL;
  const model = config.model || 'gpt-4o-mini';
  const promptTemplate = config.promptTemplate || DEFAULT_PROMPT;

  const prompt = promptTemplate.replace('{transcript}', transcript);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Summarization failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || 'No summary generated.';
}
