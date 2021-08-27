import { ChangeEvent, useEffect, useMemo, useReducer, useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { Redirect, useHistory, useLocation, useParams } from 'react-router-dom';
import { apiErrorMessage, getSubmissions, useApi } from '../api';
import Help from '../Help';
import { GameMode, IReview } from '../interfaces';
import { gameModeFromShortName, gameModeLongName, gameModes, gameModeShortName } from '../osu-helpers';
import { useOsuAuth } from '../osuAuth';
import { isCaptainForMode } from '../permissions';
import { ToggleableColumn, toggleableColumns, ToggleableColumnsState } from './helpers';
import SubmissionBeatmapset from './SubmissionBeatmapset';

const messages = defineMessages({
  bpm: {
    defaultMessage: 'BPM',
    description: 'Submissions table header',
  },
  difficultyCount: {
    defaultMessage: 'Diffs',
    description: 'Submissions table header',
  },
  favoriteCount: {
    defaultMessage: 'Favs',
    description: 'Submissions table header',
  },
  gameMode: {
    defaultMessage: 'Game mode:',
    description: 'Selector to change game mode',
  },
  playCount: {
    defaultMessage: 'Plays',
    description: 'Submissions table header',
  },
  priority: {
    defaultMessage: 'Priority',
    description: 'Submissions table header',
  },
  score: {
    defaultMessage: 'Score',
    description: 'Submissions table header',
  },
  scoreHelp: {
    defaultMessage: 'A placeholder method to sort this listing. {definition}',
    description: 'Help text for "Score" submissions table header',
  },
  status: {
    defaultMessage: 'Status',
    description: 'Submissions table header',
  },
  year: {
    defaultMessage: 'Year',
    description: 'Submissions table header',
  },
});

function columnsReducer(prevState: ToggleableColumnsState, column: ToggleableColumn): ToggleableColumnsState {
  return {
    ...prevState,
    [column]: !prevState[column],
  };
}

export default function SubmissionListingContainer() {
  const history = useHistory();
  const intl = useIntl();
  const params = useParams<{ gameMode: string; }>();
  const [columns, toggleColumn] = useReducer(columnsReducer, {
    bpm: true,
    difficultyCount: true,
    favoriteCount: true,
    playCount: true,
    score: true,
    year: true,
  });
  const [showStatus, setShowStatus] = useState(false);

  const gameMode = gameModeFromShortName(params.gameMode);

  if (gameMode == null) {
    return <Redirect to='/submissions/osu' />;
  }

  const onGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newMode = parseInt(event.currentTarget.value);

    if (newMode !== gameMode) {
      history.push(`/submissions/${gameModeShortName(newMode)}`);
    }
  };

  return (
    <>
      <FormattedMessage
        defaultMessage='Submitted maps'
        description='Submissions table title'
        tagName='h1'
      />
      <div className='warning-box'>
        <FormattedMessage
          defaultMessage='
            This listing is not yet in active use by captains. The submissions made to the Google forms will be migrated
            here soon, and from then on captains will be using this instead of the Google sheets. Currently you can use
            either this website or the Google forms to make new submissions.
          '
          description='Warning box above submissions table'
        />
      </div>
      <div className='flex-left'>
        <label htmlFor='gameMode'>{intl.formatMessage(messages.gameMode)}</label>
        <select
          name='gameMode'
          value={gameMode}
          onChange={onGameModeChange}
        >
          {gameModes.map((m) => (
            <option key={m} value={m}>{gameModeLongName(m)}</option>
          ))}
        </select>
        <FormattedMessage
          defaultMessage='Columns:'
          description='Title for options to show or hide columns'
          tagName='span'
        />
        <span className='flex-text'>
          {toggleableColumns.map((column) => (
            <button
              key={column}
              type='button'
              className={`fake-a${columns[column] ? ' underline' : ''}`}
              onClick={() => toggleColumn(column)}
            >
              {intl.formatMessage(messages[column])}
            </button>
          ))}
        </span>
        <button
          type='button'
          className='push-right'
          onClick={() => setShowStatus((prev) => !prev)}
        >
          {showStatus
            ? 'Show pending'
            : 'Show approved'
          }
        </button>
      </div>
      <SubmissionListing columns={columns} gameMode={gameMode} showStatus={showStatus} />
    </>
  );
}

interface SubmissionListingProps {
  columns: ToggleableColumnsState;
  gameMode: GameMode;
  showStatus: boolean;
}

function SubmissionListing({ columns, gameMode, showStatus }: SubmissionListingProps) {
  const history = useHistory();
  const intl = useIntl();
  const { pathname: locationPath, state: submittedBeatmapsetId } = useLocation<number | undefined>();
  const authUser = useOsuAuth().user;
  const [submissionsInfo, submissionsInfoError, setSubmissionsInfo] = useApi(getSubmissions, [gameMode]);
  const displayBeatmapsets = useMemo(() => {
    if (submissionsInfo == null)
      return null;

    return submissionsInfo.beatmapsets
      .filter((beatmapset) => showStatus ? beatmapset.ranked_status > 0 : beatmapset.ranked_status <= 0);
  }, [showStatus, submissionsInfo]);

  useEffect(() => {
    if (submissionsInfo == null || submittedBeatmapsetId == null)
      return;

    document
      .querySelector(`[data-beatmapset-id="${submittedBeatmapsetId}"]`)
      ?.scrollIntoView();
    history.replace(locationPath);
  }, [history, locationPath, submissionsInfo, submittedBeatmapsetId]);

  if (submissionsInfoError != null)
    return <span className='panic'>Failed to load submissions: {apiErrorMessage(submissionsInfoError)}</span>;

  if (submissionsInfo == null || displayBeatmapsets == null)
    return <span>Loading submissions...</span>;

  if (displayBeatmapsets.length === 0)
    return <p><b>No submissions to show!</b></p>;

  const canReview = authUser != null && isCaptainForMode(authUser, gameMode);
  const onReviewUpdate = (review: IReview) => {
    setSubmissionsInfo((prev) => {
      const beatmapset = prev!.beatmapsets.find((beatmapset) => beatmapset.id === review.beatmapset_id)!;
      const existingReview = beatmapset.reviews.find((existing) => existing.id === review.id);

      if (existingReview != null) {
        beatmapset.review_score += review.score - existingReview.score;
        Object.assign(existingReview, review);
      } else {
        if (beatmapset.reviews.length > 0) {
          beatmapset.review_score += review.score;
        } else {
          beatmapset.review_score = review.score;
        }

        beatmapset.reviews.push(review);
      }

      if (prev!.usersById[review.captain_id] == null) {
        prev!.usersById[review.captain_id] = { ...authUser!, alumni: authUser!.roles.alumni };
      }

      // TODO: Re-sort beatmapsets?

      return {
        beatmapsets: prev!.beatmapsets,
        usersById: prev!.usersById,
      };
    });
  };

  return (
    <table className='main-table submissions-table'>
      <thead>
        <tr className='sticky'>
          <FormattedMessage
            defaultMessage='Beatmapset'
            description='Submissions table header'
            tagName='th'
          />
          <FormattedMessage
            defaultMessage='Mapper'
            description='Submissions table header'
            tagName='th'
          />
          <th>
            {showStatus
              ? intl.formatMessage(messages.status)
              : intl.formatMessage(messages.priority)
            }
          </th>
          {columns.score && (
            <th>
              {intl.formatMessage(messages.score)}
              {' '}
              <Help>
                {intl.formatMessage(messages.scoreHelp, {
                  definition: `${intl.formatMessage(messages.score)} = ${intl.formatMessage(messages.favoriteCount)} × 75 + ${intl.formatMessage(messages.playCount)}`,
                })}
              </Help>
            </th>
          )}
          {columns.playCount && <th>{intl.formatMessage(messages.playCount)}</th>}
          {columns.favoriteCount && <th>{intl.formatMessage(messages.favoriteCount)}</th>}
          {columns.year && <th>{intl.formatMessage(messages.year)}</th>}
          {columns.difficultyCount && <th>{intl.formatMessage(messages.difficultyCount)}</th>}
          {columns.bpm && <th>{intl.formatMessage(messages.bpm)}</th>}
          <th />
        </tr>
      </thead>
      <tbody>
        {displayBeatmapsets.map((beatmapset) => (
          <SubmissionBeatmapset
            key={beatmapset.id}
            beatmapset={beatmapset}
            canReview={canReview && !showStatus}
            columns={columns}
            gameMode={gameMode}
            onReviewUpdate={onReviewUpdate}
            review={canReview ? beatmapset.reviews.find((review) => review.captain_id === authUser!.id) : undefined}
            showStatus={showStatus}
            usersById={submissionsInfo.usersById}
          />
        ))}
      </tbody>
    </table>
  );
}
