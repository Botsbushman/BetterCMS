﻿/*jslint unparam: true, white: true, browser: true, devel: true */
/*global bettercms */

bettercms.define('bcms.pages.content', ['bcms.jquery', 'bcms', 'bcms.modal', 'bcms.content', 'bcms.pages.widgets', 'bcms.datepicker', 'bcms.htmlEditor', 'bcms.dynamicContent', 'bcms.siteSettings', 'bcms.messages', 'bcms.preview', 'bcms.grid', 'bcms.inlineEdit', 'bcms.slides.jquery', 'bcms.redirect', 'bcms.pages.history', 'bcms.security', 'bcms.codeEditor', 'bcms.forms'],
    function ($, bcms, modal, content, widgets, datepicker, htmlEditor, dynamicContent, siteSettings, messages, preview, grid, editor, slides, redirect, history, security, codeEditor, forms) {
        'use strict';

        var pagesContent = {},
            selectors = {
                sliderBoxes: '.bcms-slider-box',
                sliderContainer: 'bcms-slides-container',

                contentId: '#bcmsContentId',
                contentVersion: '#bcmsPageContentVersion',
                pageContentId: '#bcmsPageContentId',
                parentPageContentId: '#bcmsParentPageContentId',
                contentFormRegionId: '#bcmsContentToRegionId',
                desirableStatus: '#bcmsContentDesirableStatus',
                dataPickers: '.bcms-datepicker',
                htmlEditor: '.bcms-contenthtml',
                destroyDraftVersionLink: '.bcms-messages-draft-destroy',
                pageContentUserConfirmationHiddenField: '#bcms-user-confirmed-region-deletion',

                widgetsSearchButton: '#bcms-advanced-content-search-btn',
                widgetsSearchInput: '#bcms-advanced-content-search',
                widgetsContainer: '#bcms-advanced-contents-container',
                widgetCreateButton: '#bcms-create-advanced-content-button',
                widgetRegisterButton: '#bcms-registeradvanced-content-button',
                widgetInsertButtons: '.bcms-content-insert-button',
                widgetDeleteButtons: '.bcms-content-delete-button',
                widgetEditButtons: '.bcms-content-edit-button',
                widgetContainerBlock: '.bcms-preview-block',
                widgetCategory: '.bcms-category',
                widgetName: '.bcms-title-holder > .bcms-content-titles',
                widgetIFramePreview: ".bcms-preview-box[data-as-image='False'] .bcms-zoom-overlay",
                widgetImagePreview: ".bcms-preview-box[data-as-image='True'] .bcms-zoom-overlay",
                anyTab: '.bcms-tab',

                widgetsContent: '.bcms-widgets',

                enableCustomJs: '#bcms-enable-custom-js',
                enableCustomCss: '#bcms-enable-custom-css',
                customJsContainer: '#bcms-custom-js-container',
                customCssContainer: '#bcms-custom-css-container',
                aceEditorContainer: '.bcms-editor-field-area-container:first',

                editInSourceModeHiddenField: '#bcms-edit-in-source-mode',
                firstForm: 'form:first',
                datePickers: 'input.bcms-datepicker'
            },
            classes = {
                sliderPrev: 'bcms-slider-prev',
                sliderNext: 'bcms-slider-next',
                inactive: 'bcms-inactive'
            },
            links = {
                loadWidgetsUrl: null,
                loadAddNewHtmlContentDialogUrl: null,
                insertContentToPageUrl: null,
                deletePageContentUrl: null,
                editPageContentUrl: null,
                sortPageContentUrl: null,
                previewPageUrl: null,
                selectWidgetUrl: null
            },
            globalization = {
                addNewContentDialogTitle: null,
                editContentDialogTitle: null,
                deleteContentConfirmationTitle: null,
                deleteContentConfirmationMessage: null,
                deleteContentSuccessMessageTitle: null,
                deleteContentSuccessMessageMessage: null,
                deleteContentFailureMessageTitle: null,
                deleteContentFailureMessageMessage: null,
                sortPageContentFailureMessageTitle: null,
                sortPageContentFailureMessageMessage: null,
                sortingPageContentMessage: null,
                errorTitle: null,
                insertingWidgetInfoMessage: null,
                insertingWidgetInfoHeader: null,
                insertingWidgetErrorMessage: null,
                datePickerTooltipTitle: null,
                selectWidgetDialogTitle: null
            },
            contentTypes = {
                htmlContent: 'html-content'
            };

        /**
        * Assign objects to module.
        */
        pagesContent.links = links;
        pagesContent.globalization = globalization;

        /**
        * Open dialog with add new content form
        */
        pagesContent.onAddNewContent = function (data) {
            var editorId,
                regionViewModel = data.regionViewModel,
                includeChildRegions = bcms.boolAsString(data.includeChildRegions),
                onSuccess = data.onSuccess || function () {
                    redirect.ReloadWithAlert();
                };

            modal.edit({
                title: globalization.addNewContentDialogTitle,
                disableSaveAndPublish: !security.IsAuthorized(["BcmsPublishContent"]),
                onLoad: function (dialog) {
                    var url = $.format(links.loadAddNewHtmlContentDialogUrl, bcms.pageId, regionViewModel.id, regionViewModel.parentPageContentId);
                    dynamicContent.bindDialog(dialog, url, {
                        contentAvailable: function (contentDialog, data) {
                            var editInSourceMode = false,
                                enableInsertDynamicRegion = false;

                            editorId = dialog.container.find(selectors.htmlEditor).attr('id');

                            if (data && data.Data) {
                                if (data.Data.EditInSourceMode) {
                                    editInSourceMode = true;
                                }
                                if (data.Data.EnableInsertDynamicRegion) {
                                    enableInsertDynamicRegion = true;
                                }
                            }
                            pagesContent.initializeAddNewContentForm(contentDialog, editInSourceMode, enableInsertDynamicRegion, editorId, data.Data, onSuccess, includeChildRegions);
                        },

                        beforePost: function () {
                            htmlEditor.updateEditorContent(editorId);

                            var editInSourceMode = htmlEditor.isSourceMode(editorId);
                            dialog.container.find(selectors.editInSourceModeHiddenField).val(editInSourceMode);

                            return true;
                        },

                        postSuccess: function (json) {
                            if (json.Data.DesirableStatus == bcms.contentStatus.preview) {
                                try {
                                    var result = json.Data;
                                    $(selectors.contentId).val(result.ContentId);
                                    $(selectors.pageContentId).val(result.PageContentId);
                                    preview.previewPageContent(result.PageId, result.PageContentId);
                                } finally {
                                    return false;
                                }
                            } else {
                                if ($.isFunction(onSuccess)) {
                                    onSuccess(json);
                                }
                            }

                            return true;
                        },

                        formSerialize: function (form) {
                            return widgets.serializeFormWithChildWidgetOptions(form, editorId, function (serializedData) {
                                if (includeChildRegions) {
                                    serializedData.IncludeChildRegions = true;
                                }
                            });
                        },
                        formContentType: 'application/json; charset=UTF-8'
                    });
                },
                onAccept: function () {
                    htmlEditor.destroyAllHtmlEditorInstances();
                },
                onClose: function () {
                    htmlEditor.destroyAllHtmlEditorInstances();
                }
            });
        };

        /**
        * Save content order after sorting.
        */
        pagesContent.onSortPageContent = function (data) {
            var models = data.models,
                onSuccess = data.onSuccess,
                info = modal.info({
                    content: globalization.sortingPageContentMessage,
                    disableCancel: true,
                    disableAccept: true
                });

            var url = links.sortPageContentUrl,
               alertOnError = function () {
                   modal.alert({
                       title: globalization.sortPageContentFailureMessageTitle,
                       content: globalization.sortPageContentFailureMessageMessage
                   });
               },
               dataToSend = JSON.stringify({
                   PageId: bcms.pageId,
                   PageContents: models
               });

            $.ajax({
                type: 'POST',
                url: url,
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                cache: false,
                data: dataToSend,
                success: function (json) {
                    info.close();
                    if (json.Success) {
                        if ($.isFunction(onSuccess)) {
                            onSuccess();
                        } else {
                            redirect.ReloadWithAlert();
                        }
                    } else {
                        if (json.Messages && json.Messages.length > 0) {
                            modal.showMessages(json);
                        } else {
                            alertOnError();
                        }
                    }
                },
                error: function () {
                    info.close();
                    alertOnError();
                }
            });
        };

        function initializeWidgetsTab(dialog, onInsert, editorId) {
            dialog.container.find(selectors.widgetsSearchButton).on('click', function () {
                pagesContent.updateWidgetCategoryList(dialog, onInsert);
            });

            dialog.container.find(selectors.widgetCreateButton).on('click', function () {
                widgets.openCreateHtmlContentWidgetDialog(function (json) {
                    htmlEditor.updateEditorContent(editorId);
                    // Reload search results after category was created.
                    pagesContent.updateWidgetCategoryList(dialog, onInsert);
                    messages.refreshBox(dialog.container, json);
                }, null);
            });

            dialog.container.find(selectors.widgetRegisterButton).on('click', function () {
                widgets.openCreateServerControlWidgetDialog(function (json) {
                    pagesContent.updateWidgetCategoryList(dialog, onInsert);
                    messages.refreshBox(dialog.container, json);
                }, null);
            });

            bcms.preventInputFromSubmittingForm(dialog.container.find(selectors.widgetsSearchInput), {
                preventedEnter: function () {
                    pagesContent.updateWidgetCategoryList(dialog, onInsert);
                }
            });
        }

        /**
        * Initializes content dialog form.
        */
        pagesContent.initializeAddNewContentForm = function (dialog, editInSourceMode, enableInsertDynamicRegion, editorId, data, onSuccess, includeChildRegions) {
            var onInsert = function () {
                pagesContent.insertWidget(this, dialog, onSuccess, includeChildRegions);
            };

            dialog.container.find(selectors.dataPickers).initializeDatepicker(globalization.datePickerTooltipTitle);

            initializeWidgetsTab(dialog, onInsert, editorId);

            dialog.container.find(selectors.anyTab).click(function () {
                setTimeout(function () {
                    dialog.setFocus();
                }, 100);
            });

            initializeWidgets(dialog.container, dialog, onInsert);

            htmlEditor.initializeHtmlEditor(editorId, '', {}, editInSourceMode);
            if (enableInsertDynamicRegion) {
                htmlEditor.enableInsertDynamicRegion(editorId, true, data.LastDynamicRegionNumber);
            }

            pagesContent.initializeCustomTextArea(dialog);

            codeEditor.initialize(dialog.container);
        };

        /**
        * Initializes content edit dialog form.
        */
        pagesContent.initializeEditContentForm = function (dialog, editInSourceMode, enableInsertDynamicRegion, data, editorId, includeChildRegions, onSuccess) {
            var canEdit = security.IsAuthorized(["BcmsEditContent"]),
                canPublish = security.IsAuthorized(["BcmsPublishContent"]),
                form = dialog.container.find(selectors.firstForm);

            htmlEditor.initializeHtmlEditor(editorId, data.ContentId, {}, editInSourceMode);
            if (enableInsertDynamicRegion) {
                htmlEditor.enableInsertDynamicRegion(editorId, true, data.LastDynamicRegionNumber);
            }

            pagesContent.initializeCustomTextArea(dialog);

            codeEditor.initialize(dialog.container);

            dialog.container.find(selectors.destroyDraftVersionLink).on('click', function () {
                var contentId = dialog.container.find(selectors.contentId).val(),
                    pageContentId = dialog.container.find(selectors.pageContentId).val(),
                    contentVersion = dialog.container.find(selectors.contentVersion).val();

                history.destroyDraftVersion(contentId, contentVersion, includeChildRegions, dialog.container, function (publishedId, json) {
                    dialog.close();

                    pagesContent.editPageContent(pageContentId, {
                        onCloseClick: function () {
                            // If is set what to do on success, do it, otherwise - reload the page
                            if ($.isFunction(onSuccess)) {
                                onSuccess(json);
                            } else {
                                redirect.ReloadWithAlert();
                            }
                        },
                        onSuccess: onSuccess,
                        includeChildRegions: includeChildRegions
                    });
                });
            });

            // User with only BcmsPublishContent but without BcmsEditContent can only publish and change publish dates
            if (form.data('readonly') !== true && canPublish && !canEdit) {
                form.addClass(classes.inactive);
                forms.setFieldsReadOnly(form);

                // Enable date pickers for editing
                $.each(form.find(selectors.datePickers), function () {
                    var self = $(this);

                    self.removeAttr('readonly');
                    self.parent('div').css('z-index', bcms.getHighestZindex() + 1);
                });
            }

            dialog.container.find(selectors.dataPickers).initializeDatepicker();
        };

        /**
       * Initializes custom css and js text fields.
       */
        pagesContent.initializeCustomTextArea = function (dialog) {
            dialog.container.find(selectors.enableCustomCss).on('change', function () {
                showHideCustomCssText(dialog, true);
            });

            dialog.container.find(selectors.enableCustomJs).on('change', function () {
                showHideCustomJsText(dialog, true);
            });
            showHideCustomCssText(dialog);
            showHideCustomJsText(dialog);
        };

        /**
        * Reloads widget category list.
        */
        pagesContent.updateWidgetCategoryList = function (dialog, onInsert) {
            $.ajax({
                url: $.format(links.loadWidgetsUrl, dialog.container.find(selectors.widgetsSearchInput).val()),
                cache: false,
            }).done(function (data) {
                dialog.container.find(selectors.widgetsContainer).html(data);

                initializeWidgets(dialog.container, dialog, onInsert);
                dialog.container.find(selectors.widgetsSearchInput).focus();
            });
        };

        /**
        * Initializes widget categories list with sliders.
        */
        function initializeWidgets(container, dialog, onInsert) {

            pagesContent.initializeSliders(container);

            container.find(selectors.widgetInsertButtons).on('click', onInsert);

            container.find(selectors.widgetDeleteButtons).on('click', function () {
                var self = $(this),
                    widgetContainer = self.parents(selectors.widgetContainerBlock),
                    widgetId = widgetContainer.data('originalId'),
                    widgetVersion = widgetContainer.data('originalVersion'),
                    widgetName = widgetContainer.find(selectors.widgetName).text(),
                    onComplete = function (data) {
                        messages.refreshBox(widgetContainer, data);
                        widgetContainer.hideLoading();
                    };

                widgets.deleteWidget(widgetId, widgetVersion, widgetName,
                    function () {
                        widgetContainer.showLoading();
                    },
                    function (data) {
                        onComplete(data);
                        pagesContent.updateWidgetCategoryList(dialog, onInsert);
                    },
                    onComplete);
            });

            container.find(selectors.widgetEditButtons).on('click', function () {
                var self = $(this),
                    widgetContainer = self.parents(selectors.widgetContainerBlock),
                    widgetId = widgetContainer.data('id'),
                    widgetType = widgetContainer.data('type');

                widgets.editWidget(widgetId, widgetType, function (data) {
                    messages.refreshBox(widgetContainer, data);
                    pagesContent.updateWidgetCategoryList(dialog, onInsert);
                },
                null);
            });

            preview.initialize(container.find(selectors.widgetsContainer), selectors.widgetIFramePreview);

            // Add preview for widget with images (unbind click for iframe preview)
            dialog.container.find(selectors.widgetImagePreview).unbind('click');
            dialog.container.find(selectors.widgetImagePreview).on('click', function () {
                var self = $(this),
                    url = self.data('previewUrl'),
                    alt = self.data('previewTitle');

                modal.imagePreview(url, alt);
            });
        };

        /**
        * Inserts widget to CMS page
        */
        pagesContent.insertWidget = function (self, dialog, onSuccess, includeChildRegions) {
            var regionId = dialog.container.find(selectors.contentFormRegionId).val(),
                parentPageContentId = dialog.container.find(selectors.parentPageContentId).val(),
                widgetContainer = $(self).parents(selectors.widgetContainerBlock),
                contentId = widgetContainer.data('originalId'),
                url = $.format(links.insertContentToPageUrl, bcms.pageId, contentId, regionId, parentPageContentId, includeChildRegions);

            if (!onSuccess) {
                onSuccess = function () {
                    redirect.ReloadWithAlert();
                };
            }

            $.ajax({
                type: 'POST',
                url: url,
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                cache: false,
                beforeSend: function () {
                    dialog.close();

                    dialog = modal.info({
                        title: globalization.insertingWidgetInfoHeader,
                        content: globalization.insertingWidgetInfoMessage,
                        disableCancel: true,
                        disableAccept: true
                    });
                },

                success: function (data) {
                    dialog.close();
                    if (data && data.Success) {
                        onSuccess(data);
                    } else {
                        modal.alert({
                            title: globalization.errorTitle,
                            content: data.Messages ? data.Messages[0] : globalization.insertingWidgetErrorMessage
                        });
                    }
                },

                error: function () {
                    dialog.close();
                    modal.alert({
                        title: globalization.errorTitle,
                        content: globalization.insertingWidgetErrorMessage
                    });
                }
            });
        };

        /**
        * Initializes a content sliders.
        */
        pagesContent.initializeSliders = function (container) {
            var updateSlide = function (slideBox, currentSlideNumber) {
                var currentSlide = slideBox.find(".bcms-slides-single-slide").get([currentSlideNumber - 1]);
                $(currentSlide).find('.bcms-preview-box').each(function () {
                    var previewBox = $(this),
                        data = previewBox.data();
                    if (!data.isLoaded) {
                        if (data.asImage === "True") {
                            previewBox.find('div:first').append($.format("<img src=\"{0}\" alt=\"{1}\" />",
                                data.previewUrl, data.title));
                        } else {
                            previewBox.find('div:first').append($.format("<iframe class=\"{0}\" width=\"{1}\" height=\"{2}\" scrolling=\"no\" border=\"0\" frameborder=\"0\" src=\"{3}\" style=\"background-color:white;\"/>",
                                data.frameCssClass, data.width, data.height, data.previewUrl));
                        }
                        previewBox.data("isLoaded", true);
                    }
                });
            };
            container.find(selectors.sliderBoxes).each(function () {
                var slideBox = $(this);
                slideBox.slides({
                    container: selectors.sliderContainer,
                    generateNextPrev: true,
                    generatePagination: false,
                    prev: classes.sliderPrev,
                    next: classes.sliderNext,
                    slidesLoaded: function () {
                        updateSlide(slideBox, 1);
                    },
                    animationStart: function (currentSlideNumber) {
                    },
                    animationComplete: function (currentSlideNumber) {
                        updateSlide(slideBox, currentSlideNumber);
                    }
                });
            });
        };

        /**
        * Called when content view model is created
        */
        function onContentModelCreated(contentViewModel) {
            var contentId = contentViewModel.contentId,
                pageContentId = contentViewModel.pageContentId;

            if (contentViewModel.contentType == contentTypes.htmlContent) {
                // Edit content
                contentViewModel.onEditContent = function (onSuccess, includeChildRegions) {
                    pagesContent.editPageContent(pageContentId, {
                        onSuccess: onSuccess,
                        includeChildRegions: includeChildRegions
                    });
                };

                contentViewModel.visibleButtons.configure = false;

                if (!security.IsAuthorized(["BcmsEditContent", "BcmsPublishContent"])) {
                    contentViewModel.visibleButtons.history = false;
                    contentViewModel.visibleButtons.edit = false;
                }

                if (!security.IsAuthorized(["BcmsEditContent"])) {
                    contentViewModel.visibleButtons["delete"] = false;
                }
            }

            // Delete content
            contentViewModel.onDeleteContent = function (onDeleteSuccess) {
                pagesContent.removeContentFromPage(contentViewModel.pageContentId,
                    contentViewModel.pageContentVersion,
                    contentViewModel.contentVersion,
                    onDeleteSuccess);
            };

            // Content history
            contentViewModel.onContentHistory = function (onContentRestore, includeChildRegions) {
                history.openPageContentHistoryDialog(contentId, pageContentId, {
                    onContentRestore: onContentRestore,
                    includeChildRegions: includeChildRegions
                });
            };

            // Change draft icon
            if (contentViewModel.draft) {
                contentViewModel.visibleButtons.draft = true;
            }
        }

        /**
        * Opens dialog for editing page regular content  
        */
        pagesContent.editPageContent = function (contentId, opts) {
            opts = $.extend({
                onCloseClick: null,
                onSuccess: null,
                includeChildRegions: false
            }, opts);

            var canEdit = security.IsAuthorized(["BcmsEditContent"]),
                onCloseClick = opts.onCloseClick,
                onSuccess = opts.onSuccess,
                includeChildRegions = (opts.includeChildRegions === true),
                editorId;

            modal.edit({
                title: globalization.editContentDialogTitle,
                disableSaveDraft: !canEdit,
                isPreviewAvailable: canEdit,
                disableSaveAndPublish: !security.IsAuthorized(["BcmsPublishContent"]),
                onCloseClick: onCloseClick,
                onLoad: function (dialog) {
                    var url = $.format(links.editPageContentUrl, contentId);
                    dynamicContent.bindDialog(dialog, url, {
                        contentAvailable: function (contentDialog, json) {
                            var editInSourceMode = false,
                                enableInsertDynamicRegion = false;

                            editorId = dialog.container.find(selectors.htmlEditor).attr('id');

                            if (json && json.Data) {
                                if (json.Data.EditInSourceMode) {
                                    editInSourceMode = true;
                                }
                                if (json.Data.EnableInsertDynamicRegion) {
                                    enableInsertDynamicRegion = true;
                                }
                            }
                            pagesContent.initializeEditContentForm(contentDialog, editInSourceMode, enableInsertDynamicRegion, json.Data, editorId, includeChildRegions, onSuccess);
                        },

                        beforePost: function () {
                            htmlEditor.updateEditorContent(editorId);

                            var editInSourceMode = htmlEditor.isSourceMode(editorId);
                            dialog.container.find(selectors.editInSourceModeHiddenField).val(editInSourceMode);

                            return true;
                        },

                        postError: function (json) {
                            if (json.Data && json.Data.ConfirmationMessage) {
                                modal.confirm({
                                    content: json.Data.ConfirmationMessage,
                                    onAccept: function () {
                                        dialog.container.find(selectors.pageContentUserConfirmationHiddenField).val(true);
                                        dialog.submitForm();
                                        return true;
                                    }
                                });
                            }
                        },

                        postSuccess: function (json) {
                            if (json.Data.DesirableStatus == bcms.contentStatus.preview) {
                                try {
                                    preview.previewPageContent(bcms.pageId, json.Data.PageContentId);
                                } finally {
                                    return false;
                                }
                            } else {
                                if ($.isFunction(onSuccess)) {
                                    onSuccess(json);
                                } else {
                                    redirect.ReloadWithAlert();
                                }
                            }

                            return true;
                        },

                        formSerialize: function (form) {
                            return widgets.serializeFormWithChildWidgetOptions(form, editorId, function (serializedData) {
                                if (includeChildRegions) {
                                    serializedData.IncludeChildRegions = true;
                                }
                            });
                        },
                        formContentType: 'application/json; charset=utf-8'
                    });
                },
                onAccept: function () {
                    htmlEditor.destroyAllHtmlEditorInstances();
                },
                onClose: function () {
                    htmlEditor.destroyAllHtmlEditorInstances();
                }
            });
        };

        /**
        * Removes regular content from page.
        */
        pagesContent.removeContentFromPage = function (pageContentId, pageContentVersion, contentVersion, onDeleteSuccess) {
            if (!onDeleteSuccess) {
                onDeleteSuccess = function () {
                    redirect.ReloadWithAlert({
                        title: globalization.deleteContentSuccessMessageTitle,
                        message: globalization.deleteContentSuccessMessageMessage,
                        timeout: 1500
                    });
                };
            }

            var createUrl = function (isUserConfirmed) {
                return $.format(links.deletePageContentUrl, pageContentId, pageContentVersion, contentVersion, isUserConfirmed);
            },
                getUrl = function () {
                    return createUrl(false);
                },
                onDeleteCompleted = function (json) {
                    try {
                        if (json.Success) {
                            onDeleteSuccess(json);
                        }
                        else {
                            if (json.Data && json.Data.ConfirmationMessage) {
                                modal.confirm({
                                    content: json.Data.ConfirmationMessage,
                                    onAccept: function () {
                                        getUrl = function () {
                                            return createUrl(true);
                                        };
                                        confirmDialog.accept();
                                        return true;
                                    }
                                });
                            } else if (json.Messages && json.Messages.length > 0) {
                                modal.showMessages(json);
                            } else {
                                modal.alert({
                                    title: globalization.deleteContentFailureMessageTitle,
                                    content: globalization.deleteContentFailureMessageMessage
                                });
                            }
                        }
                    } finally {
                        confirmDialog.close();
                    }
                },
                confirmDialog = modal.confirm({
                    title: globalization.deleteContentConfirmationTitle,
                    content: globalization.deleteContentConfirmationMessage,
                    onAccept: function () {
                        $.ajax({
                            type: 'POST',
                            url: getUrl(),
                            contentType: 'application/json; charset=utf-8',
                            dataType: 'json',
                            cache: false
                        })
                        .done(function (json) {
                            onDeleteCompleted(json);
                        })
                        .fail(function (response) {
                            onDeleteCompleted(bcms.parseFailedResponse(response));
                        });
                        return false;
                    }
                });
        };

        /**
        * Function tries to resolve ace editor container ithin given container and focuses the editor
        */
        function focusAceEditor(container) {
            var aceEditor = container.find(selectors.aceEditorContainer).data('aceEditor');
            if (aceEditor != null) {
                aceEditor.focus();
            }
        }

        /**
        * IE11 fix: recall resize method after editors initialization
        */
        function resizeAceEditor(container) {
            setTimeout(function () {
                var aceEditor = container.find(selectors.aceEditorContainer).data('aceEditor');
                if (aceEditor && $.isFunction(aceEditor.resize)) {
                    aceEditor.resize(true);
                    aceEditor.renderer.updateFull();
                }
            }, 20);
        }

        /**
        * Shows/hides custom css field in a content edit form
        */
        function showHideCustomCssText(dialog, focus) {
            var customCssContainer = dialog.container.find(selectors.customCssContainer);

            if (dialog.container.find(selectors.enableCustomCss).attr('checked')) {
                customCssContainer.show();
                resizeAceEditor(customCssContainer);
                if (focus) {
                    focusAceEditor(customCssContainer);
                }
            } else {
                customCssContainer.hide();
            }
        };

        function showHideCustomJsText(dialog, focus) {
            var customJsContainer = dialog.container.find(selectors.customJsContainer);

            if (dialog.container.find(selectors.enableCustomJs).attr('checked')) {
                customJsContainer.show();
                resizeAceEditor(customJsContainer);
                if (focus) {
                    focusAceEditor(customJsContainer);
                }
            } else {
                customJsContainer.hide();
            }
        };

        /**
        * Inserts dynamic region 
        */
        function onDynamicRegionInsert(htmlContentEditor) {
            if (htmlContentEditor != null) {
                var last = htmlContentEditor.LastDynamicRegionNumber || 0,
                    isMasterPage = htmlContentEditor.IsMasterPage === true,
                    regionIdentifier,
                    html;

                // If widget
                if (!isMasterPage) {
                    last++;
                    regionIdentifier = 'WidgetRegion' + last + '_' + bcms.createGuid().replace('-', '');
                } else {
                    last++;
                    if (last == 1) {
                        regionIdentifier = 'CMSMainContent';
                    } else {
                        regionIdentifier = 'ContentRegion' + last;
                    }
                }
                htmlContentEditor.LastDynamicRegionNumber = last;

                if (htmlContentEditor.mode == 'source') {
                    html = '<div>{{DYNAMIC_REGION:' + regionIdentifier + '}}</div>';
                    htmlContentEditor.addHtml(html);
                } else {
                    // Create fake CKEditor object with real object representation (inversion of code in /[BetterCms.Module.Root]/Scripts/ckeditor/plugins/cms-dynamicregion/plugin.js).
                    // NOTE: EDITOR.createFakeParserElement(...) functionality does not work...
                    html = '<div class="bcms-draggable-region" data-cke-realelement="%3Cdiv%3E%7B%7BDYNAMIC_REGION%3A'
                        + regionIdentifier
                        + '%7D%7D%3C%2Fdiv%3E" data-cke-real-node-type="1" title="Dynamic Region" data-cke-real-element-type="cmsdynamicregion" isregion="true">Content to add</div>';
                    var re = CKEDITOR.dom.element.createFromHtml(html, htmlContentEditor.document);
                    htmlContentEditor.insertElement(re);
                }
            }
        }

        /**
        * Inserts child widget to the content
        */
        function onWidgetInsert(opts) {
            var htmlContentEditor = opts.editor,
                editorId = opts.editorId;

            if (!htmlContentEditor) {
                return;
            }

            var dialog,
                onInsert = function () {
                    var widgetContainer = $(this).parents(selectors.widgetContainerBlock),
                        contentId = widgetContainer.data('originalId').toUpperCase(),
                        title = widgetContainer.find(selectors.widgetName).text(),
                        html = '<widget data-id="' + contentId + '" data-assign-id="' + bcms.createGuid() + '">' + title + '</widget>';

                    if (htmlContentEditor.mode == 'source') {
                        htmlContentEditor.addHtml(html);
                    } else {
                        var re = CKEDITOR.dom.element.createFromHtml(html, htmlContentEditor.document);
                        htmlContentEditor.insertElement(re);
                    }

                    dialog.close();
                };

            dialog = modal.open({
                title: globalization.selectWidgetDialogTitle,
                disableAccept: true,
                onLoad: function (dialog) {
                    var url = links.selectWidgetUrl;
                    dynamicContent.bindDialog(dialog, url, {
                        contentAvailable: function (contentDialog) {
                            initializeWidgetsTab(contentDialog, onInsert, editorId);
                            initializeWidgets(contentDialog.container, contentDialog, onInsert);
                        },
                    });
                }
            });
        }

        /**
        * Initializes page module.
        */
        pagesContent.init = function () {
            bcms.logger.debug('Initializing bcms.pages.content module.');
        };

        /**
        * Subscribe to events
        */
        bcms.on(bcms.events.addPageContent, pagesContent.onAddNewContent);
        bcms.on(bcms.events.sortPageContent, pagesContent.onSortPageContent);
        bcms.on(bcms.events.contentModelCreated, onContentModelCreated);
        bcms.on(htmlEditor.events.insertDynamicRegion, onDynamicRegionInsert);
        bcms.on(htmlEditor.events.insertWidget, onWidgetInsert);

        /**
        * Register initialization
        */
        bcms.registerInit(pagesContent.init);

        return pagesContent;
    });
