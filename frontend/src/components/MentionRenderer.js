import React from 'react';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Chip, Avatar } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const MentionChip = styled(Chip)(({ theme }) => ({
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  fontWeight: 500,
  textDecoration: 'none',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    textDecoration: 'none',
  },
  '& .MuiChip-label': {
    paddingLeft: theme.spacing(0.5),
    paddingRight: theme.spacing(1),
  },
  '& .MuiChip-avatar': {
    width: 20,
    height: 20,
    fontSize: '0.75rem',
  },
}));

const MentionLink = styled(Link)(({ theme }) => ({
  color: theme.palette.primary.main,
  textDecoration: 'none',
  fontWeight: 500,
  '&:hover': {
    textDecoration: 'none',
  },
  '&:visited': {
    color: theme.palette.primary.main,
  },
}));

// Helper to escape regex special characters in usernames
const escapeRegExp = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extract candidate display names from raw content (heuristic for Title Case names with spaces)
 */
const extractTitleCaseNames = (text = '') => {
  if (!text.includes('@')) return [];
  const results = new Set();
  // Matches @Oscar or @Oscar Ho or @Mary Jane Watson (up to 3 spaces)
  const rx = /@([A-Z][A-Za-z0-9_-]*(?:\s+[A-Z][A-Za-z0-9_-]*){0,3})/g;
  let m;
  while ((m = rx.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length) results.add(name);
  }
  return Array.from(results);
};

/**
 * Component to render text content with mentions as clickable links
 * @param {Object} props
 * @param {string} props.content - The content with mention placeholders
 * @param {Array} props.mentions - Array of mention objects with user data
 * @param {string} props.variant - Display variant: 'chip' or 'link' (default: 'link')
 * @param {boolean} props.showAvatar - Whether to show user avatar in chip variant
 * @returns {JSX.Element}
 */
const MentionRenderer = ({ 
  content = '', 
  mentions = [], 
  variant = 'link', 
  showAvatar = true 
}) => {
  const { token } = useAuth();
  const [nameToUserMap, setNameToUserMap] = React.useState({});
  const [resolved, setResolved] = React.useState(false);

  // Moved here to satisfy React Hooks rules (must not be conditional)
  React.useEffect(() => {
    let abort = false;
    const needsResolve = !mentions.length && content && content.includes('@') && !content.includes('@[');
    if (!needsResolve || !token) {
      setResolved(true);
      return;
    }

    const names = extractTitleCaseNames(content).slice(0, 5); // limit to avoid too many calls
    if (names.length === 0) {
      setResolved(true);
      return;
    }

    const fetchMatches = async () => {
      try {
        const results = await Promise.all(
          names.map(async (name) => {
            const resp = await fetch(`/api/mentions/search?q=${encodeURIComponent(name)}&limit=5`, {
              headers: { 'x-auth-token': token },
            });
            if (!resp.ok) return { name, user: null };
            const arr = await resp.json();
            const exact = arr.find(u => (u.name || '').toLowerCase() === name.toLowerCase());
            return { name, user: exact || null };
          })
        );
        if (abort) return;
        const map = {};
        results.forEach(({ name, user }) => {
          if (user && user._id) {
            map[name] = { userId: user._id, username: user.name, avatar: user.avatar };
          }
        });
        setNameToUserMap(map);
      } catch (e) {
        // ignore
      } finally {
        if (!abort) setResolved(true);
      }
    };

    fetchMatches();
    return () => {
      abort = true;
    };
  }, [content, mentions.length, token]);

  // Parse server-rendered mention span HTML: <span class="mention" data-user-id="ID">@Name</span>
  if (content && (content.includes('class="mention"') || content.includes("class='mention'"))) {
    const parts = [];
    let lastIndex = 0;
    const rx = /<span[^>]*class=["']mention["'][^>]*data-user-id=["']([^"']+)["'][^>]*>([^<]+)<\/span>/g;
    let m;
    while ((m = rx.exec(content)) !== null) {
      if (m.index > lastIndex) {
        // Add any preceding plain text (strip any other tags crudely) with URLs made clickable
        const text = content.substring(lastIndex, m.index).replace(/<[^>]+>/g, '');
        if (text) {
          parts.push(renderContentWithUrls(text));
        }
      }
      const userId = m[1];
      const display = m[2];
      if (variant === 'chip') {
        const meta = (mentions || []).find(mm => (mm.userId || mm._id || mm.id) === userId);
        const userName = meta?.username || meta?.name || display.replace(/^@/, '') || 'User';
        const avatar = meta?.avatar;
        parts.push(
          <MentionChip
            key={`mention-${userId}-${parts.length}`}
            component={Link}
            to={`/profile/${userId}`}
            label={`@${userName}`}
            avatar={
              showAvatar ? (
                avatar ? (
                  <Avatar src={avatar} alt={userName} sx={{ width: 20, height: 20 }}>
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                ) : (
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }}>
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                )
              ) : undefined
            }
            size="small"
            clickable
          />
        );
      } else {
        parts.push(
          <MentionLink key={`mention-${userId}-${parts.length}`} to={`/profile/${userId}`}>
            {display}
          </MentionLink>
        );
      }
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < content.length) {
      const tail = content.substring(lastIndex).replace(/<[^>]+>/g, '');
      if (tail) parts.push(renderContentWithUrls(tail));
    }
    return <span>{parts}</span>;
  }

  // Always handle placeholder mentions like @[Name](userId) regardless of mentions array
  if (content && content.includes('@[')) {
    const parts = [];
    let lastIndex = 0;
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention, with URLs made clickable
      if (match.index > lastIndex) {
        const textBeforeMention = content.substring(lastIndex, match.index);
        parts.push(renderContentWithUrls(textBeforeMention));
      }

      const id = match[2];
      const name = match[1];
      const meta = (mentions || []).find(m => (m.userId || m._id || m.id) === id);
      const displayName = meta?.username || meta?.name || name;
      const avatar = meta?.avatar;

      if (variant === 'chip') {
        parts.push(
          <MentionChip
            key={`mention-${id}-${parts.length}`}
            component={Link}
            to={`/profile/${id}`}
            label={`@${displayName}`}
            avatar={
              showAvatar ? (
                avatar ? (
                  <Avatar src={avatar} alt={displayName} sx={{ width: 20, height: 20 }}>
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                ) : (
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </Avatar>
                )
              ) : undefined
            }
            size="small"
            clickable
          />
        );
      } else {
        parts.push(
          <MentionLink
            key={`mention-${id}-${parts.length}`}
            to={`/profile/${id}`}
          >
            @{displayName}
          </MentionLink>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-end`}>
          {content.substring(lastIndex)}
        </span>
      );
    }

    return <span>{parts}</span>;
  }

  // Client-side resolve when we have raw content with @Names but no mentions/placeholder
  // (useEffect moved above to comply with React hooks rules)
  if (!mentions.length && content && content.includes('@') && !content.includes('@[') && resolved) {
    const names = Object.keys(nameToUserMap);
    if (names.length) {
      // Build a regex to match any resolved name after '@'
      const alternation = names
        .map(n => escapeRegExp(n))
        .sort((a, b) => b.length - a.length)
        .join('|');
      const rx2 = new RegExp(`@(${alternation})`, 'g');

      const parts = [];
      let lastIdx = 0;
      let mm;
      while ((mm = rx2.exec(content)) !== null) {
        if (mm.index > lastIdx) {
          parts.push(
            <span key={`text-${parts.length}`}>{content.substring(lastIdx, mm.index)}</span>
          );
        }
        const name = mm[1];
        const data = nameToUserMap[name];
        if (data) {
          parts.push(
            <MentionLink key={`mention-${data.userId}-${parts.length}`} to={`/profile/${data.userId}`}>
              @{data.username}
            </MentionLink>
          );
        } else {
          parts.push(<span key={`text-mention-${parts.length}`}>@{name}</span>);
        }
        lastIdx = mm.index + mm[0].length;
      }
      if (lastIdx < content.length) {
        parts.push(<span key={`text-end`}>{content.substring(lastIdx)}</span>);
      }
      return <span>{parts}</span>;
    }
  }
  
  // If content DOES NOT contain placeholders but mentions are present,
  // linkify raw "@Username" occurrences using mentions metadata
  if (mentions.length && content && !content.includes('@[')) {
    const parts = [];
    let lastIndex = 0;

    const enrichedMentions = mentions
      .map(m => ({
        userId: m.userId || m._id || m.id,
        username: m.username || m.name || 'Unknown',
        avatar: m.avatar,
      }))
      .filter(m => !!m.userId && !!m.username);

    if (!enrichedMentions.length) {
      return <span>{content}</span>;
    }

    // Build regex that matches any of the mentioned usernames following an '@'
    const alternation = enrichedMentions
      .map(m => escapeRegExp(m.username))
      .sort((a, b) => b.length - a.length) // longest first to avoid partial matches
      .join('|');

    const rawMentionRegex = new RegExp(`@(${alternation})`, 'g');

    let match;
    while ((match = rawMentionRegex.exec(content)) !== null) {
      // Add text before the match, with URLs made clickable
      if (match.index > lastIndex) {
        const textBeforeMatch = content.substring(lastIndex, match.index);
        parts.push(renderContentWithUrls(textBeforeMatch));
      }

      const matchedName = match[1];
      const m = enrichedMentions.find(x => x.username === matchedName);

      if (m) {
        if (variant === 'chip') {
          parts.push(
            <MentionChip
              key={`mention-${m.userId}-${parts.length}`}
              component={Link}
              to={`/profile/${m.userId}`}
              label={`@${m.username}`}
              avatar={
                showAvatar && m.avatar ? (
                  <Avatar 
                    src={m.avatar}
                    alt={m.username}
                    sx={{ width: 20, height: 20 }}
                  >
                    {m.username.charAt(0).toUpperCase()}
                  </Avatar>
                ) : (
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }}>
                    {m.username.charAt(0).toUpperCase()}
                  </Avatar>
                )
              }
              size="small"
              clickable
            />
          );
        } else {
          parts.push(
            <MentionLink
              key={`mention-${m.userId}-${parts.length}`}
              to={`/profile/${m.userId}`}
            >
              @{m.username}
            </MentionLink>
          );
        }
      } else {
        // Fallback: not found in mentions; render as plain text
        parts.push(
          <span key={`text-mention-${parts.length}`}>@{matchedName}</span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-end`}>
          {content.substring(lastIndex)}
        </span>
      );
    }

    return <span>{parts}</span>;
  }
  
  if (!content || !mentions.length) {
    // Process content to make URLs clickable even without mentions
    return renderContentWithUrls(content);
  }

  // Split content by mention placeholders and render with appropriate components
  const renderContent = () => {
    let processedContent = content;
    const parts = [];
    let lastIndex = 0;

    // Sort mentions by their position in the content to process them in order
    const sortedMentions = mentions.sort((a, b) => {
      const userName1 = a.username || a.name || 'Unknown';
      const userName2 = b.username || b.name || 'Unknown';
      const aIndex = content.indexOf(`@[${userName1}](${a.userId})`);
      const bIndex = content.indexOf(`@[${userName2}](${b.userId})`);
      return aIndex - bIndex;
    });

    sortedMentions.forEach((mention, index) => {
      const userName = mention.username || mention.name || 'Unknown';
      const placeholder = `@[${userName}](${mention.userId})`;
      const mentionIndex = processedContent.indexOf(placeholder, lastIndex);
      
      if (mentionIndex !== -1) {
        // Add text before mention, with URLs made clickable
        if (mentionIndex > lastIndex) {
          const textBeforeMention = processedContent.substring(lastIndex, mentionIndex);
          parts.push(renderContentWithUrls(textBeforeMention));
        }

        // Add mention component
        if (variant === 'chip') {
          parts.push(
            <MentionChip
              key={`mention-${mention.userId}-${index}`}
              component={Link}
              to={`/profile/${mention.userId}`}
              label={`@${userName}`}
              avatar={
                showAvatar && mention.avatar ? (
                  <Avatar 
                    src={mention.avatar} 
                    alt={userName}
                    sx={{ width: 20, height: 20 }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                ) : (
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }}>
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                )
              }
              size="small"
              clickable
            />
          );
        } else {
          parts.push(
            <MentionLink
              key={`mention-${mention.userId}-${index}`}
              to={`/profile/${mention.userId}`}
            >
              @{userName}
            </MentionLink>
          );
        }

        lastIndex = mentionIndex + placeholder.length;
      }
    });

    // Add remaining text after last mention, with URLs made clickable
    if (lastIndex < processedContent.length) {
      const remainingText = processedContent.substring(lastIndex);
      parts.push(renderContentWithUrls(remainingText));
    }

    return parts.length > 0 ? parts : <span>{content}</span>;
  };

  return <span>{renderContent()}</span>;
};

/**
 * Hook to process content and mentions for rendering
 * @param {string} parsedContent - Content with mention placeholders
 * @param {Array} mentions - Array of mention objects
 * @returns {Object} - Object with processed content and mention data
 */
/**
 * Function to detect URLs in text and make them clickable
 * @param {string} text - Text that might contain URLs
 * @returns {JSX.Element} - Element with URLs converted to links
 */
const renderContentWithUrls = (text) => {
  if (!text) return <span>{text}</span>;
  
  // Regular expression to match URLs (http, https, www, etc.)
  const urlRegex = /(\b(https?:\/\/|www\.)[^\s/$.?#].[^\s]*\b)/gi;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Extract the full URL
    const fullUrl = match[0];
    
    // Create a link for the URL
    let href;
    if (fullUrl.startsWith('http')) {
      href = fullUrl;
    } else {
      href = 'https://' + fullUrl; // Add https:// if not present
    }
    
    parts.push(
      <a
        key={`url-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#1976d2',
          textDecoration: 'underline',
          fontWeight: '500'
        }}
      >
        {fullUrl}
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  // If we have more than one part, wrap in a span, otherwise return single element
  if (parts.length === 1) {
    return <span>{parts[0]}</span>;
  } else {
    return <span>{parts.map((part, index) => 
      typeof part === 'string' ? <span key={`text-${index}`}>{part}</span> : part
    )}</span>;
  }
};

export const useMentionData = (parsedContent, mentions) => {
  const [mentionData, setMentionData] = React.useState({
    content: parsedContent || '',
    mentions: mentions || []
  });

  React.useEffect(() => {
    // Update mention data when props change
    setMentionData({
      content: parsedContent || '',
      mentions: mentions || []
    });
  }, [parsedContent, mentions]);

  return mentionData;
};

/**
 * Utility function to extract plain text from content with mentions
 * @param {string} content - Content with mention placeholders
 * @param {Array} mentions - Array of mention objects
 * @returns {string} - Plain text without mention placeholders
 */
export const extractPlainText = (content, mentions = []) => {
  if (!content || !mentions.length) {
    return content || '';
  }

  let plainText = content;
  mentions.forEach(mention => {
    const placeholder = `@[${mention.username}](${mention.userId})`;
    plainText = plainText.replace(placeholder, `@${mention.username}`);
  });

  return plainText;
};

/**
 * Utility function to get mentioned user IDs from mentions array
 * @param {Array} mentions - Array of mention objects
 * @returns {Array} - Array of user IDs
 */
export const getMentionedUsers = (mentions = []) => {
  return mentions.map(mention => mention.userId);
};

export default MentionRenderer;