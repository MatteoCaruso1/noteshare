import { useNavigate } from 'react-router-dom';
import { Fragment } from 'react';

interface CommentTextProps {
  content: string;
}

export function CommentText({ content }: CommentTextProps) {
  const navigate = useNavigate();

  // Parse the content and make @mentions clickable
  const parts = content.split(/(@\w+)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to find the profile by username
                navigate(`/profile/${username}`);
              }}
              className="text-primary hover:underline font-medium"
            >
              {part}
            </button>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </span>
  );
}
