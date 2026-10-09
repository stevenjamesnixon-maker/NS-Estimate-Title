/**
 * qt_ue_estimate_title.js
 *
 * Fills the native Estimate Title field from the quote description, in beforeSubmit, so that it
 * runs in every execution context — including Web Services / REST creates from the external
 * quoting system, which never reach the UI-only setter.
 *
 * Fill blank only: a Title that is already set — by a user, by the API payload, or by the OneZone
 * block in the margin client script — is never overwritten. Consequence: once set, changing the
 * description does not update the Title. Deliberate. See docs/context.md.
 *
 * Quote types listed in the Excluded Quote Types parameter are skipped (OneZone). The list lives
 * on the deployment, not in code, because quote type internal IDs differ between environments.
 *
 * A failure here is logged and swallowed. It must never block an Estimate saving.
 *
 * House style is ES5 throughout — var, function, 'use strict'. Deliberate. Do not modernise.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @version 1.0.0
 */
define(['N/runtime', 'N/log'], function (runtime, log) {

    'use strict';

    var VERSION = '1.0.0';

    var TITLE_FIELD_ID = 'title';
    var SOURCE_FIELD_ID = 'custbody_quote_description';
    var QUOTE_TYPE_FIELD = 'custbody_quote_type';
    var PARAM_EXCLUDED = 'custscript_qt_excluded_quote_types';
    var TITLE_MAX_LENGTH = 40;

    /**
     * Reads a field as a trimmed string. Null, undefined and non-string values become ''.
     *
     * @param {Record} rec
     * @param {string} fieldId
     * @returns {string}
     */
    function readTrimmed(rec, fieldId) {
        var raw = rec.getValue({ fieldId: fieldId });

        if (raw === null || raw === undefined) {
            return '';
        }

        return String(raw).replace(/^\s+|\s+$/g, '');
    }

    /**
     * Parses the Excluded Quote Types parameter: comma-separated internal IDs, each trimmed,
     * empties dropped. Empty parameter means exclude none.
     *
     * @returns {string[]}
     */
    function readExcludedQuoteTypes() {
        var raw = runtime.getCurrentScript().getParameter({ name: PARAM_EXCLUDED });

        if (raw === null || raw === undefined || String(raw) === '') {
            return [];
        }

        var parts = String(raw).split(',');
        var result = [];

        for (var i = 0; i < parts.length; i++) {
            var entry = parts[i].replace(/^\s+|\s+$/g, '');
            if (entry !== '') {
                result.push(entry);
            }
        }

        return result;
    }

    /**
     * Derives a single-line title from the description: strip HTML tags, collapse all whitespace
     * (including \r, \n, \t) to single spaces, trim, truncate to TITLE_MAX_LENGTH.
     *
     * Trimmed again after truncation so a cut that lands on a space does not leave a trailing one.
     *
     * @param {string} description
     * @returns {string}
     */
    function deriveTitle(description) {
        var text = String(description)
            .replace(/<[^>]*>/g, '')
            .replace(/[\r\n\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');

        return text.substring(0, TITLE_MAX_LENGTH).replace(/\s+$/, '');
    }

    /**
     * @param {Object} context
     */
    function beforeSubmit(context) {
        var types = context.UserEventType;

        // XEDIT gives a partial record; never act on it.
        if (context.type === types.DELETE || context.type === types.XEDIT) {
            return;
        }

        if (context.type !== types.CREATE && context.type !== types.EDIT &&
            context.type !== types.COPY) {
            return;
        }

        var rec = context.newRecord;
        var recordId = rec.id || null;

        try {
            // Fill-blank rule. Checked before the description is read.
            var currentTitle = readTrimmed(rec, TITLE_FIELD_ID);
            if (currentTitle !== '') {
                log.debug('Title already set', JSON.stringify({
                    id: recordId, type: context.type, version: VERSION
                }));
                return;
            }

            var description = readTrimmed(rec, SOURCE_FIELD_ID);
            if (description === '') {
                log.debug('Description empty', JSON.stringify({
                    id: recordId, type: context.type, version: VERSION
                }));
                return;
            }

            // Raw stored value — the list option's internal ID — compared as a string.
            var quoteTypeRaw = rec.getValue({ fieldId: QUOTE_TYPE_FIELD });
            var quoteType = (quoteTypeRaw === null || quoteTypeRaw === undefined) ?
                '' : String(quoteTypeRaw);

            var excluded = readExcludedQuoteTypes();
            if (quoteType !== '' && excluded.indexOf(quoteType) !== -1) {
                log.audit('QT_TITLE_SKIPPED', JSON.stringify({
                    id: recordId, type: context.type, quoteType: quoteType
                }));
                return;
            }

            var derived = deriveTitle(description);
            if (derived === '') {
                log.debug('Derived title empty', JSON.stringify({
                    id: recordId, type: context.type, version: VERSION
                }));
                return;
            }

            rec.setValue({ fieldId: TITLE_FIELD_ID, value: derived });

            // id is null on create in beforeSubmit — logged anyway.
            log.audit('QT_TITLE_SET', JSON.stringify({
                id: recordId, type: context.type, quoteType: quoteType, after: derived
            }));
        } catch (e) {
            log.error('QT_TITLE_FAILED', JSON.stringify({
                id: recordId,
                type: context.type,
                version: VERSION,
                error: e && e.name ? e.name + ': ' + e.message : String(e)
            }));
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
