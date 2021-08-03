import { Fragment } from 'react';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import { IMapperConsent } from '../interfaces';
import { UserInline } from '../UserInline';

const consentMap = {
  null: ['No reply', 'pending'],
  0: ['No', 'error'],
  1: ['Yes', 'success'],
  2: ['Unreachable', 'pending'],
} as const;

function consentToCell(consent?: 0 | 1 | 2 | boolean) {
  if (consent === true) {
    consent = 1;
  } else if (consent === false) {
    consent = 0;
  }

  const [consentStr, className] = consentMap[consent ?? 'null'];

  return (
    <td className={className}>
      {consentStr}
    </td>
  );
}

function MapperBeatmapsetConsents(mapperConsent: IMapperConsent) {
  return (
    <table style={{ 'width': '80%', 'marginLeft': '3em', 'marginRight': '3em', 'tableLayout': 'fixed' }}>
      <tr>
        <th style={{'width': '30%'}}>Beatmapset</th>
        <th style={{'width': '10%'}}>Consent</th>
        <th style={{'width': '60%'}}>Notes</th>
      </tr>
      {mapperConsent.beatmapset_consents.map((consent) => (
        <tr key={consent.beatmapset.id}>
          <td><BeatmapInline beatmapset={consent.beatmapset} /></td>
          {consentToCell(consent.consent)}
          <td>{consent.consent_reason}</td>
        </tr>
      ))}
    </table>
  );
}

export default function MapperConsents() {
  const [consents, consentError] = useApi(getMapperConsents);

  if (consentError != null)
    return <span className='panic'>Failed to load mapper consents: {apiErrorMessage(consentError)}</span>;

  if (consents == null)
    return <span>Loading mapper consents...</span>;

  return (
    <div className='content-block'>
      <h1>Mapper Consents</h1>
      <table>
        <tr className='sticky'>
          <th>Mapper</th>
          <th>Consent</th>
          <th>Notes</th>
        </tr>
        {consents.map((consent) => (
          <Fragment key={consent.id}>
            <tr>
              <td><UserInline user={consent.mapper} /></td>
              {consentToCell(consent.consent)}
              <td>{consent.consent_reason}</td>
            </tr>
            {consent.beatmapset_consents.length > 0 && (
              <tr>
                <td colSpan={3}>{MapperBeatmapsetConsents(consent)}</td>
              </tr>
            )}
          </Fragment>
        ))}
      </table>
    </div>
  );
}