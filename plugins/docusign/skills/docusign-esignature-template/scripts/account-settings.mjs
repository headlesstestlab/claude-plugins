/**
 * Print the eSignature account settings a compiled template needs, one line each: what it is, who can turn it on
 * (an account admin, or only Docusign: an Account Plan Editor item or an add-on), and whether the template breaks
 * while it is off. The needs come from the generated compiler (lib/esign-account-settings.mjs).
 */
import { ACCOUNT_SETTING_RULES, esignAccountNeeds } from './lib/esign-account-settings.mjs';

const DOCUSIGN_ONLY = {
  'id-verification': 'the ID Verification add-on, and the workflow the template names',
  notary: 'the Docusign Notary add-on, and a notary profile for the notary user',
};

export function printAccountSettings(template, label = '') {
  for (const n of esignAccountNeeds(template)) {
    const rule = ACCOUNT_SETTING_RULES.find((r) => r.id === n.id);
    const docusign = rule?.docusign ?? DOCUSIGN_ONLY[n.id];
    const who = [rule && `admin: ${rule.admin}`, docusign && `${rule ? 'if the admin cannot, ' : ''}ask Docusign for ${docusign}`].filter(Boolean).join('; ');
    console.log(`ACCOUNT SETTING ${label}${n.label} (${n.setting}): ${who}${n.blocks ? ' — BLOCKS the template while off' : ''}`);
  }
}
