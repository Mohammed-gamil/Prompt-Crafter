interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble({ role, content }: ChatBubbleProps) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
          role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
