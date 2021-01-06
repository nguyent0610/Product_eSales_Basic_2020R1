Ext.ns("Ext.net", "Ext.ux", "Ext.ux.plugins", "Ext.ux.layout");
Ext.net.Version = "2.5.2";

Ext.net.ListenerRemover = function(observable) {
    if (observable instanceof Ext.net.ListenerRemover) {
        return observable;
    }
    this.observable = observable;
    if (arguments[1].isObservable) {
        this.managedListeners = true;
    }
    this.args = Ext.Array.slice(arguments, 1);
};
Ext.net.ListenerRemover.prototype.destroy = function() {
    this.observable[this.managedListeners ? 'mun' : 'un'].apply(this.observable, this.args);
};
Ext.util.Observable.override({
    constructor: function(config) {
        this.callParent(arguments);
        this.directListeners = this.directListeners || {};
        this.hasDirectListeners = this.hasDirectListeners || {};
        if (Ext.net && Ext.net.MessageBus) {
            Ext.net.MessageBus.initEvents(this);
        }
    }
});
Ext.net._supportsAddEventListener = !Ext.isIE9 && 'addEventListener' in document;
Ext.EventManager.removeListener = function(element, eventName, fn, scope) {
    if (typeof eventName !== 'string') {
        Ext.EventManager.prepareListenerConfig(element, eventName, true);
        return;
    }
    var dom = Ext.getDom(element),
        id, el = element.dom ? element : Ext.get(dom),
        cache = Ext.EventManager.getEventListenerCache(el, eventName),
        bindName = Ext.EventManager.normalizeEvent(eventName).eventName,
        i = cache.length,
        j, cacheItem, hasRemoveEventListener, listener, wrap;
    if (!dom) {
        return;
    }
    hasRemoveEventListener = Ext.net._supportsAddEventListener || (Ext.isIE9 && !dom.detachEvent);
    if (typeof fn === 'string') {
        fn = Ext.resolveMethod(fn, scope || element);
    }
    while (i--) {
        listener = cache[i];
        if (listener && (!fn || listener.fn == fn) && (!scope || listener.scope === scope)) {
            wrap = listener.wrap;
            if (wrap.task) {
                clearTimeout(wrap.task);
                delete wrap.task;
            }
            j = wrap.tasks && wrap.tasks.length;
            if (j) {
                while (j--) {
                    clearTimeout(wrap.tasks[j]);
                }
                delete wrap.tasks;
            }
            if (!hasRemoveEventListener) {
                id = Ext.EventManager.normalizeId(dom, true);
                cacheItem = Ext.cache[id][bindName];
                if (cacheItem && cacheItem.firing) {
                    cache = Ext.EventManager.cloneEventListenerCache(dom, bindName);
                }
                if (cache.length === 1) {
                    fn = cacheItem.fn;
                    delete Ext.cache[id][bindName];
                    dom.detachEvent('on' + bindName, fn);
                }
            } else if (dom.removeEventListener) {
                dom.removeEventListener(bindName, wrap, listener.capture);
            }
            if (wrap && dom == document && eventName == 'mousedown') {
                Ext.EventManager.stoppedMouseDownEvent.removeListener(wrap);
            }
            Ext.Array.erase(cache, i, 1);
        }
    }
};
Ext.EventManager.un = Ext.EventManager.removeListener;
Ext.util.DirectObservable = {
    initDirectEvents: function() {
        if (!this.directListeners) {
            this.directListeners = {};
        }
        if (!this.hasDirectListeners) {
            this.hasDirectListeners = {};
        }
        if (!this.isDirectInit) {
            this.isDirectInit = true;
            if (this.directEvents) {
                this.addDirectListener(this.directEvents);
                this.directEvents = null;
            }
        }
    },
    beforeDirectEvent: Ext.emptyFn,
    afterDirectEvent: Ext.emptyFn,
    fireEvent: function(eventName) {
        this.initDirectEvents();
        return this.fireEventArgs(eventName, Array.prototype.slice.call(arguments, 1));
    },
    fireEventArgs: function(eventName, args) {
        eventName = eventName.toLowerCase();
        var me = this,
            events = me.events,
            directListeners = me.directListeners,
            event = events && events[eventName],
            directListener = directListeners && directListeners[eventName];
        ret = true;
        if ((event || directListener) && (me.hasListeners[eventName] || me.hasDirectListeners[eventName])) {
            ret = me.continueFireEvent(eventName, args || emptyArray, (event || directListener).bubble);
        }
        return ret;
    },
    continueFireEvent: function(eventName, args, bubbles) {
        var target = this,
            queue, event, ret = true;
        do {
            if (target.eventsSuspended) {
                if ((queue = target.eventQueue)) {
                    queue.push([eventName, args, bubbles]);
                }
                return ret;
            } else {
                event = target.events[eventName];
                if (event && event != true) {
                    if ((ret = event.fire.apply(event, args)) === false) {
                        break;
                    }
                }
                target.initDirectEvents();
                event = target.directListeners[eventName];
                if (event && event != true) {
                    if ((ret = event.fire.apply(event, args)) === false) {
                        break;
                    }
                }
            }
        } while (bubbles && (target = target.getBubbleParent()));
        return ret;
    },
    addListener: function(ename, fn, scope, options) {
        var me = this,
            config, event, hasListeners, prevListenerCount = 0;
        if (!me.hasListeners) {
            me.hasListeners = new me.HasListeners();
        }
        if (this instanceof Ext.AbstractComponent) {
            var element = ename,
                listeners = fn;
            if (Ext.isString(element) && (Ext.isObject(listeners) || options && options.element)) {
                if (options.element) {
                    fn = listeners;
                    listeners = {};
                    listeners[element] = fn;
                    element = options.element;
                    if (scope) {
                        listeners.scope = scope;
                    }
                    for (option in options) {
                        if (options.hasOwnProperty(option)) {
                            if (me.eventOptionsRe.test(option)) {
                                listeners[option] = options[option];
                            }
                        }
                    }
                }
                if (me[element] && me[element].on) {
                    me.mon(me[element], listeners);
                } else {
                    me.afterRenderEvents = me.afterRenderEvents || {};
                    if (!me.afterRenderEvents[element]) {
                        me.afterRenderEvents[element] = [];
                    }
                    me.afterRenderEvents[element].push(listeners);
                }
                return;
            }
            ename = element;
            fn = listeners;
        }
        if (typeof ename !== 'string') {
            options = ename;
            for (ename in options) {
                if (options.hasOwnProperty(ename)) {
                    config = options[ename];
                    if (!me.eventOptionsRe.test(ename)) {
                        me.addListener(ename, (config.fn || config.broadcastOnBus) ? config.fn : config, config.scope || options.scope, (config.fn || config.broadcastOnBus) ? config : options);
                    }
                }
            }
            if (options && options.destroyable) {
                return new Ext.net.ListenerRemover(me, options);
            }
        } else {
            ename = ename.toLowerCase();
            event = me.events[ename];
            if (event && event.isEvent) {
                prevListenerCount = event.listeners.length;
            } else {
                me.events[ename] = event = new Ext.util.Event(me, ename);
            }
            if (fn) {
                if (typeof fn === 'string') {
                    scope = scope || me;
                    fn = Ext.resolveMethod(fn, scope);
                }
                event.addListener(fn, scope, options);
                if (event.listeners.length !== prevListenerCount) {
                    hasListeners = me.hasListeners;
                    me.hasListeners._incr_(ename);
                }
                if (options && options.destroyable) {
                    return new Ext.net.ListenerRemover(me, ename, fn, scope, options);
                }
            }
            if (options && options.broadcastOnBus) {
                var parts = options.broadcastOnBus.split(":"),
                    bus, name;
                if (parts.length == 1) {
                    bus = Ext.net.Bus;
                    name = parts[0];
                } else {
                    bus = Ext.net.ResourceMgr.getCmp(parts[0]);
                    name = parts[1];
                }
                fn = Ext.Function.bind(function() {
                    var bus = arguments[arguments.length - 2],
                        name = arguments[arguments.length - 1],
                        options = arguments[arguments.length - 3],
                        data = arguments,
                        i, len;
                    if (options.argumentsList) {
                        data = {};
                        for (i = 0, len = options.argumentsList.length; i < len; i++) {
                            data[options.argumentsList[i]] = arguments[i];
                        }
                    }
                    bus.publish(name, data);
                }, this, [bus, name], true);
                event.addListener(fn, scope, Ext.isObject(options) ? options : {});
                me.hasListeners[ename] = (me.hasListeners[ename] || 0) + 1;
            }
        }
    },
    addDirectListener: function(ename, fn, scope, options) {
        var me = this,
            config, event, hasListeners, hasDirectListeners, prevListenerCount = 0;
        if (!me.hasListeners) {
            me.hasListeners = new me.HasListeners();
        }
        if (!this.directListeners) {
            this.directListeners = {};
        }
        if (!this.hasDirectListeners) {
            this.hasDirectListeners = {};
        }
        if (typeof ename !== 'string') {
            options = ename;
            for (ename in options) {
                if (options.hasOwnProperty(ename)) {
                    config = options[ename];
                    if (!me.eventOptionsRe.test(ename)) {
                        me.addDirectListener(ename, config.fn || config, config.scope || options.scope, config.fn ? config : options);
                    }
                }
            }
            if (options && options.destroyable) {
                return new Ext.net.ListenerRemover(me, ename, fn, scope, options);
            }
        } else {
            ename = ename.toLowerCase();
            event = me.directListeners[ename];
            if (event && event.isEvent) {
                prevListenerCount = event.listeners.length;
            } else {
                me.directListeners[ename] = event = new Ext.util.Event(me, ename);
            }
            if (typeof fn === 'string') {
                scope = scope || me;
                fn = Ext.resolveMethod(fn, scope);
            }
            options = Ext.isObject(options) ? options : {};
            if (!Ext.isDefined(options.delay)) {
                options.delay = 20;
            }
            if (options.delay <= 0) {
                delete options.delay;
            }
            event.addListener(fn, scope, options);
            event.addListener(fn, scope, options);
            if (event.listeners.length !== prevListenerCount) {
                hasListeners = me.hasListeners;
                if (hasListeners.hasOwnProperty(ename)) {
                    ++hasListeners[ename];
                } else {
                    hasListeners[ename] = 1;
                }
                hasDirectListeners = me.hasDirectListeners;
                if (hasDirectListeners.hasOwnProperty(ename)) {
                    ++hasDirectListeners[ename];
                } else {
                    hasDirectListeners[ename] = 1;
                }
            }
            if (options && options.destroyable) {
                return new Ext.net.ListenerRemover(me, ename, fn, scope, options);
            }
        }
    },
    removeDirectListener: function(name) {
        if (this.directListeners) {
            var event = this.directListeners[name];
            if (event && this.hasDirectListeners[name]) {
                delete this.hasDirectListeners[name];
                event.clearListeners();
            }
        }
    },
    suspendEvent: function(eventName) {
        var len = arguments.length,
            i, event;
        for (i = 0; i < len; i++) {
            event = this.events[arguments[i]];
            if (event && event.suspend) {
                event.suspend();
            }
            event = this.directListeners[arguments[i]];
            if (event && event.suspend) {
                event.suspend();
            }
        }
    },
    resumeEvent: function() {
        var len = arguments.length,
            i, event;
        for (i = 0; i < len; i++) {
            event = this.events[arguments[i]];
            if (event && event.resume) {
                event.resume();
            }
            event = this.directListeners[arguments[i]];
            if (event && event.resume) {
                event.resume();
            }
        }
    },
    clearListeners: function() {
        var events = this.events,
            directListeners = this.directListeners,
            hasListeners = this.hasListeners,
            hasDirectListeners = this.hasDirectListeners,
            event, key;
        for (key in events) {
            if (events.hasOwnProperty(key)) {
                event = events[key];
                if (event.isEvent) {
                    delete hasListeners[key];
                    event.clearListeners();
                }
            }
        }
        for (key in directListeners) {
            if (directListeners.hasOwnProperty(key)) {
                event = directListeners[key];
                if (directListeners.isEvent) {
                    delete hasDirectListeners[key];
                    event.clearListeners();
                }
            }
        }
        this.clearManagedListeners();
    }
};
Ext.Component.prototype.fireEventArgs = function(ev, args) {
    var ret = Ext.util.DirectObservable.fireEventArgs.apply(this, arguments);
    if (ret !== false) {
        ret = Ext.app.domain.Component.dispatch(this, ev, args);
    }
    return ret;
};

Ext.apply(Ext.core.Element, {
    serializeForm: function(form, parentEl) {
        var fElements = form.elements || (document.forms[form] || Ext.getDom(form)).elements,
            hasSubmit = false,
            hasValue, encoder = encodeURIComponent,
            element, name, data = [],
            type, submitDisabled = Ext.net && Ext.net.ResourceMgr && Ext.net.ResourceMgr.submitDisabled;
        hasSubmit = form.ignoreAllSubmitFields || false;
        for (var i = 0; i < fElements.length; i++) {
            element = fElements[i];
            name = element.name;
            type = element.type;
            if (!Ext.isEmpty(parentEl) && Ext.isEmpty(Ext.fly(element).parent("#" + parentEl.id))) {
                continue;
            }
            if ((!element.disabled || submitDisabled) && name) {
                if (/select-(one|multiple)/i.test(type)) {
                    Ext.each(element.options, function(opt) {
                        if (opt.selected) {
                            hasValue = opt.hasAttribute ? opt.hasAttribute('value') : opt.getAttributeNode('value').specified;
                            data.push(encoder(name));
                            data.push("=");
                            data.push(encoder(hasValue ? opt.value : opt.text));
                            data.push("&");
                        }
                    });
                } else if (!/file|undefined|reset|button/i.test(type)) {
                    if (!(/radio|checkbox/i.test(type) && !element.checked) && !(type == "submit" && hasSubmit)) {
                        data.push(encoder(name));
                        data.push("=");
                        data.push(encoder(element.value));
                        data.push("&");
                        if (type == "submit") {
                            hasSubmit = /submit/i.test(type);
                        }
                    }
                }
            }
        }
        data = data.join("");
        data = data.substr(0, data.length - 1);
        return data;
    }
});

Ext.data.Connection.override({
    setOptions: Ext.Function.createInterceptor(Ext.data.Connection.prototype.setOptions, function(options, scope) {
        if (options.json) {
            options.jsonData = options.params;
        }
        if (options.xml) {
            options.xmlData = options.params;
        }
    }),
    setupHeaders: Ext.Function.createInterceptor(Ext.data.Connection.prototype.setupHeaders, function(xhr, options, data, params) {
        if (options.json) {
            options.jsonData = options.params;
        }
        if (options.xml) {
            options.xmlData = options.params;
        }
    })
});

Ext.net.DirectEvent = new Ext.data.Connection({
    autoAbort: false,
    confirmTitle: "Confirmation",
    confirmMessage: "Are you sure?",
    confirmRequest: function(directEventConfig) {
        directEventConfig = directEventConfig || {};
        if (Ext.isFunction(directEventConfig.success)) {
            directEventConfig.userSuccess = directEventConfig.success;
            delete directEventConfig.success;
        }
        if (Ext.isFunction(directEventConfig.failure)) {
            directEventConfig.userFailure = directEventConfig.failure;
            delete directEventConfig.failure;
        }
        if (Ext.isFunction(directEventConfig.complete)) {
            directEventConfig.userComplete = directEventConfig.complete;
            delete directEventConfig.complete;
        }
        if (directEventConfig.confirmation && directEventConfig.confirmation.confirmRequest) {
            if (directEventConfig.confirmation.beforeConfirm && directEventConfig.confirmation.beforeConfirm(directEventConfig) === false) {
                Ext.net.DirectEvent.request(directEventConfig);
                return;
            }
            Ext.Msg.confirm(directEventConfig.confirmation.title || this.confirmTitle, directEventConfig.confirmation.message || this.confirmMessage, Ext.Function.bind(this.confirmAnswer, this, [directEventConfig], true), this);
        } else {
            Ext.net.DirectEvent.request(directEventConfig);
        }
    },
    confirmAnswer: function(btn, text, buttonConfig, directEventConfig) {
        if (btn == "yes") {
            Ext.net.DirectEvent.request(directEventConfig);
        }
        if (btn == "no" && directEventConfig.confirmation.cancel) {
            directEventConfig.confirmation.cancel(directEventConfig);
        }
    },
    serializeForm: function(form) {
        return Ext.lib.Ajax.serializeForm(form);
    },
    setValue: function(form, name, value) {
        Ext.net.ResourceMgr.initAspInputs();
        var input = null,
            pe, els = Ext.fly(form).select("input[name=" + name + "]");
        if (els.getCount() > 0) {
            input = els.elements[0];
        } else {
            input = document.createElement("input");
            input.setAttribute("name", name);
            input.setAttribute("type", "hidden");
        }
        input.setAttribute("value", value);
        pe = input.parentElement ? input.parentElement : input.parentNode;
        if (Ext.isEmpty(pe)) {
            form.appendChild(input);
        }
    },
    delayedF: function(el, remove) {
        if (!Ext.isEmpty(el)) {
            el.unmask();
            if (remove === true) {
                el.remove();
                Ext.getBody().removeCls("x-masked");
            }
        }
    },
    showFailure: function(response, errorMsg) {
        var bodySize = Ext.getBody().getViewSize(),
            width = (bodySize.width < 500) ? bodySize.width - 50 : 500,
            height = (bodySize.height < 300) ? bodySize.height - 50 : 300,
            win;
        if (Ext.isEmpty(errorMsg)) {
            errorMsg = response.responseText;
        }
        win = new Ext.window.Window({
            modal: true,
            width: width,
            height: height,
            title: "Request Failure",
            layout: "fit",
            maximizable: true,
            items: [{
                xtype: "container",
                layout: {
                    type: "vbox",
                    align: "stretch"
                },
                items: [{
                    xtype: "container",
                    height: 42,
                    layout: "absolute",
                    defaultType: "label",
                    items: [{
                        xtype: "component",
                        x: 5,
                        y: 5,
                        html: '<div class="x-message-box-error" style="width:32px;height:32px"></div>'
                    }, {
                        x: 42,
                        y: 6,
                        html: "<b>Status Code: </b>"
                    }, {
                        x: 125,
                        y: 6,
                        text: response.status
                    }, {
                        x: 42,
                        y: 25,
                        html: "<b>Status Text: </b>"
                    }, {
                        x: 125,
                        y: 25,
                        text: response.statusText
                    }]
                }, {
                    flex: 1,
                    itemId: "__ErrorMessageEditor",
                    xtype: "htmleditor",
                    value: errorMsg,
                    readOnly: true,
                    enableAlignments: false,
                    enableColors: false,
                    enableFont: false,
                    enableFontSize: false,
                    enableFormat: false,
                    enableLinks: false,
                    enableLists: false,
                    enableSourceEdit: false
                }]
            }]
        });
        win.show();
    },
    parseResponse: function(response, options) {
        var text = response.responseText,
            result = {},
            tmpResult, exception = false;
        result.success = true;
        try {
            if (/^<\?xml/.test(text)) {
                var xmlData = response.responseXML,
                    root = xmlData.documentElement || xmlData,
                    q = Ext.DomQuery;
                if (root.nodeName == "DirectResponse") {
                    var sv = q.selectValue("Success", root, true),
                        pSuccess = sv !== false && sv !== "false",
                        pErrorMessage = q.selectValue("ErrorMessage", root, ""),
                        pScript = q.selectValue("Script", root, ""),
                        pViewState = q.selectValue("ViewState", root, ""),
                        pViewStateEncrypted = q.selectValue("ViewStateEncrypted", root, ""),
                        pEventValidation = q.selectValue("EventValidation", root, ""),
                        pServiceResponse = q.selectValue("ServiceResponse", root, ""),
                        pUserParamsResponse = q.selectValue("ExtraParamsResponse", root, ""),
                        pResult = q.selectValue("Result", root, "");
                    if (!Ext.isEmpty(pSuccess)) {
                        Ext.apply(result, {
                            success: pSuccess
                        });
                    }
                    if (!Ext.isEmpty(pErrorMessage)) {
                        Ext.apply(result, {
                            errorMessage: pErrorMessage
                        });
                    }
                    if (!Ext.isEmpty(pScript)) {
                        Ext.apply(result, {
                            script: pScript
                        });
                    }
                    if (!Ext.isEmpty(pViewState)) {
                        Ext.apply(result, {
                            viewState: pViewState
                        });
                    }
                    if (!Ext.isEmpty(pViewStateEncrypted)) {
                        Ext.apply(result, {
                            viewStateEncrypted: pViewStateEncrypted
                        });
                    }
                    if (!Ext.isEmpty(pEventValidation)) {
                        Ext.apply(result, {
                            eventValidation: pEventValidation
                        });
                    }
                    if (!Ext.isEmpty(pServiceResponse)) {
                        Ext.apply(result, {
                            serviceResponse: eval("(" + pServiceResponse + ")")
                        });
                    }
                    if (!Ext.isEmpty(pUserParamsResponse)) {
                        Ext.apply(result, {
                            extraParamsResponse: eval("(" + pUserParamsResponse + ")")
                        });
                    }
                    if (!Ext.isEmpty(pResult)) {
                        Ext.apply(result, {
                            result: eval("(" + pResult + ")")
                        });
                    }
                    return {
                        result: result,
                        exception: false
                    };
                } else {
                    return {
                        result: response.responseXML,
                        exception: false
                    };
                }
            }
            result = eval("(" + text + ")");
        } catch (e) {
            result.success = false;
            exception = true;
            if (response.responseText.length === 0) {
                result.errorMessage = "NORESPONSE";
            } else {
                result.errorMessage = "BADRESPONSE: " + e.message;
                result.responseText = response.responseText;
            }
            response.statusText = result.errorMessage;
        }
        if (result && result.d) {
            result = result.d;
            if (Ext.isString(result) && options.isDirectMethod !== true) {
                tmpResult = Ext.decode(result, true);
                if (!tmpResult) {
                    result = {
                        script: result
                    };
                } else {
                    result = tmpResult;
                }
            }
        }
        return {
            result: result,
            exception: exception
        };
    },
    cacheBusterCheck: function(o) {
        var method = o.method || this.method || ((o.params || o.xmlData || o.jsonData || o.form) ? "POST" : "GET"),
            url = o.url || this.url,
            form = Ext.getDom(o.form);
        if (form) {
            url = url || form.action;
        }
        if (method === "POST" && (this.disableCaching && o.disableCaching !== false)) {
            if (Ext.isFunction(url)) {
                url = url.call(o.scope || "window", o);
            }
            var dcp = o.disableCachingParam || this.disableCachingParam;
            o.url = Ext.net.ResourceMgr.resolveUrl(Ext.urlAppend(url, dcp + '=' + (new Date().getTime())));
        }
    },
    buildForm: function(o, cmp) {
        o.formCfg = {};
        o.formCfg.action = Ext.ClassManager.instantiateByAlias('formaction.standardsubmit', {
            form: cmp.getForm()
        });
        o.formCfg.action.submitEmptyText = false;
        o.formCfg.form = o.formCfg.action.buildForm().formEl;
        o.form = Ext.get(o.formCfg.form);
    },
    listeners: {
        beforerequest: {
            fn: function(conn, options) {
                var o = options || {},
                    key, obj;
                o.eventType = o.eventType || "event";
                o._paramsFn = {};
                var isInstance = o.eventType == "public",
                    submitConfig = {},
                    forms, aspForm;
                if (o.extraParams) {
                    for (key in o.extraParams) {
                        if (o.extraParams.hasOwnProperty(key)) {
                            obj = o.extraParams[key];
                            if (obj === undefined) {
                                delete o.extraParams[key];
                            } else if (Ext.isFunction(obj)) {
                                o._paramsFn[key] = o.extraParams[key];
                                o.extraParams[key] = obj.apply(o.control);
                            }
                        }
                    }
                } else {
                    o.extraParams = {};
                }
                switch (o.eventType) {
                    case "event":
                    case "bus":
                    case "custom":
                    case "proxy":
                    case "postback":
                    case "public":
                        if (isInstance) {
                            o.action = o.name;
                        }
                        if (Ext.net.ResourceMgr.isMVC) {
                            o.cleanRequest = true;
                        }
                        o.control = o.control || {};
                        o.type = o.type || "submit";
                        o.viewStateMode = o.viewStateMode || "default";
                        o.action = o.action || "Click";
                        o.headers = Ext.apply(o.headers || {}, {
                            "X-Ext-Net": "delta=true"
                        });
                        if (o.control && o.control.beforeDirectEvent) {
                            o.control.beforeDirectEvent(o);
                        }
                        if (o.type == "submit") {
                            if (Ext.isFunction(o.formId)) {
                                o.form = o.formId.call(o.control);
                            } else if (o.formId) {
                                o.form = Ext.get(o.formId);
                                if (!o.form) {
                                    o.form = Ext.net.ResourceMgr.getCmp(o.formId);
                                }
                            }
                            if (!Ext.isEmpty(o.form) && !Ext.isEmpty(o.form.id)) {
                                var cmp = Ext.getCmp(o.form.id);
                                if (!Ext.isEmpty(cmp) && cmp.getForm && cmp.submit) {
                                    this.buildForm(o, cmp);
                                }
                            }
                            if (Ext.isEmpty(o.form) && !Ext.isEmpty(o.control.el)) {
                                if (Ext.isEmpty(o.control.isComposite) || o.control.isComposite === false) {
                                    o.form = o.control.el.up("form");
                                    if (Ext.isEmpty(o.form) && o.control.up) {
                                        var formPanel = o.control.up("form");
                                        if (!Ext.isEmpty(formPanel) && formPanel.getForm && formPanel.submit) {
                                            this.buildForm(o, formPanel);
                                        }
                                    }
                                } else {
                                    o.form = Ext.get(o.control.elements[0]).up("form");
                                }
                            }
                            if (Ext.isEmpty(o.form) && Ext.isEmpty(o.url) && !Ext.isEmpty(Ext.net.ResourceMgr.aspForm)) {
                                o.form = Ext.get(Ext.net.ResourceMgr.aspForm);
                            }
                            if (Ext.isEmpty(o.form) && o.control && o.control.alias == "widget.form") {
                                this.buildForm(o, o.control);
                            }
                            if (Ext.isEmpty(o.form) && o.control && Ext.isFunction(o.control.up)) {
                                var formCmp = o.control.up("form");
                                if (formCmp && Ext.isFunction(formCmp.getForm)) {
                                    this.buildForm(o, formCmp);
                                }
                            }
                            if (o.isUpload && Ext.isEmpty(o.form)) {
                                o.form = Ext.get(Ext.DomHelper.append(Ext.getBody(), {
                                    tag: 'form',
                                    style: 'display:none'
                                }));
                                o.formCfg = {};
                                o.formCfg.form = o.form.dom;
                            }
                        } else if (o.type == "load") {
                            delete o.form;
                        }
                        if (Ext.isEmpty(o.form) && Ext.isEmpty(o.url)) {
                            if (!Ext.isEmpty(Ext.net.ResourceMgr.aspForm)) {
                                aspForm = Ext.getDom(Ext.net.ResourceMgr.aspForm);
                            }
                            if (aspForm) {
                                if (o.type == "submit") {
                                    o.form = aspForm;
                                } else {
                                    o.url = aspForm.action;
                                }
                            }
                        }
                        var argument = Ext.net.StringUtils.format("{0}|{1}|{2}", o.proxyId || o.control.storeId || o.control.proxyId || o.control.id || "-", o.eventType, o.action);
                        if (!Ext.isEmpty(o.form)) {
                            if (Ext.net.ResourceMgr.isMVC !== true) {
                                this.setValue(o.form.dom, "__EVENTTARGET", Ext.net.ResourceMgr.id);
                                this.setValue(o.form.dom, "__EVENTARGUMENT", argument);
                            }
                            Ext.getDom(o.form).ignoreAllSubmitFields = true;
                        } else {
                            o.url = o.url || Ext.net.ResourceMgr.url || window.location.href;
                            if (Ext.net.ResourceMgr.isMVC !== true) {
                                Ext.apply(submitConfig, {
                                    __EVENTTARGET: Ext.net.ResourceMgr.id,
                                    __EVENTARGUMENT: argument
                                });
                            }
                        }
                        if (o.viewStateMode != "default") {
                            Ext.apply(submitConfig, {
                                viewStateMode: o.viewStateMode
                            });
                        }
                        if (o.rethrowException) {
                            submitConfig.rethrowException = true;
                        }
                        if (o.before) {
                            if (o.before.call(o.control || window, o.control, o.eventType, o.action, o.extraParams, o) === false) {
                                return false;
                            }
                        }
                        if (this.fireEvent("beforeajaxrequest", o.control, o.eventType, o.action, o.extraParams, o) === false) {
                            return false;
                        }
                        if (!Ext.isEmpty(o.extraParams) && !Ext.isEmptyObj(o.extraParams)) {
                            Ext.apply(submitConfig, {
                                extraParams: o.extraParams
                            });
                        }
                        if (!Ext.isEmpty(o.serviceParams)) {
                            Ext.apply(submitConfig, {
                                serviceParams: o.serviceParams
                            });
                        }
                        if (!Ext.isEmpty(submitConfig) && !Ext.isEmptyObj(submitConfig)) {
                            o.params = {
                                submitDirectEventConfig: Ext.encode({
                                    config: submitConfig
                                })
                            };
                        } else {
                            o.params = {};
                        }
                        if (!Ext.isEmpty(o.form)) {
                            var enctype = Ext.getDom(o.form).getAttribute("enctype");
                            if ((enctype && enctype.toLowerCase() == "multipart/form-data") || o.isUpload) {
                                Ext.apply(o.params, {
                                    "__ExtNetDirectEventMarker": "delta=true"
                                });
                            }
                        }
                        if (o.cleanRequest) {
                            o.params = Ext.apply({}, o.extraParams || {});
                            if (o.json) {
                                o.jsonData = o.params;
                                o.headers = Ext.apply(o.headers || {}, {
                                    Accept: 'application/json'
                                });
                                if ((o.method || this.method) !== "GET") {
                                    o.params = "";
                                }
                                o.json = false;
                            } else {
                                var ov;
                                for (key in o.params) {
                                    ov = o.params[key];
                                    if (typeof ov == "object") {
                                        o.params[key] = Ext.encode(ov);
                                    }
                                }
                            }
                        }
                        if (!Ext.isEmpty(o.form)) {
                            o.form.dom.action = o.form.dom.action || o.form.action || o.url || Ext.net.ResourceMgr.url || window.location.href;
                        }
                        break;
                    case "static":
                        o.headers = {
                            "X-Ext-Net": "delta=true,staticmethod=true"
                        };
                        if (Ext.isEmpty(o.form) && Ext.isEmpty(o.url)) {
                            forms = Ext.select("form").elements;
                            o.url = (forms.length == 1 && !Ext.isEmpty(forms[0].action)) ? forms[0].action : Ext.net.ResourceMgr.url || window.location.href;
                        }
                        if (o.before) {
                            if (o.before(o.control, o.eventType, o.action, o.extraParams) === false) {
                                return false;
                            }
                        }
                        if (this.fireEvent("beforeajaxrequest", o.control, o.eventType, o.action, o.extraParams, o) === false) {
                            return false;
                        }
                        o.params = Ext.apply(o.extraParams, {
                            "_methodName_": o.name
                        });
                        if (o.rethrowException) {
                            o.params._rethrowException_ = true;
                        }
                        break;
                }
                o.scope = this;
                if (o.disableControl && o.control && Ext.isFunction(o.control.disable)) {
                    o.control.disable();
                }
                var el, em = o.eventMask || {};
                if ((em.showMask === true)) {
                    if (!Ext.isEmpty(em.customTarget, false) && Ext.isEmpty(em.target, false)) {
                        em.target = "customtarget";
                    }
                    switch (em.target || "page") {
                        case "this":
                            if (o.control.getEl) {
                                el = o.control.getEl();
                            } else if (o.control.dom) {
                                el = o.control;
                            }
                            break;
                        case "body":
                            if (o.control.body) {
                                el = o.control.body;
                            } else if (o.control.getEl) {
                                el = o.control.getEl();
                            } else if (o.control.dom) {
                                el = o.control;
                            }
                            break;
                        case "parent":
                            if (o.control.getEl) {
                                el = o.control.getEl().parent();
                            } else if (o.control.parent) {
                                el = o.control.parent();
                            }
                            break;
                        case "page":
                            var theHeight = "100%";
                            if (window.innerHeight) {
                                theHeight = window.innerHeight + "px";
                            } else if (document.documentElement && document.documentElement.clientHeight) {
                                theHeight = document.documentElement.clientHeight + "px";
                            } else if (document.body) {
                                theHeight = document.body.clientHeight + "px";
                            }
                            Ext.getBody().addCls("x-masked");
                            el = Ext.getBody().createChild({
                                cls: "x-page-mask",
                                style: "position:absolute;left:0;top:0;width:100%;height:" + theHeight + ";z-index:20000;background-color:Transparent;"
                            });
                            var scroll = Ext.getBody().getScroll();
                            el.setLeftTop(scroll.left, scroll.top);
                            break;
                        case "customtarget":
                            var trg = em.customTarget || "";
                            if (Ext.isFunction(trg)) {
                                el = Ext.net.getEl(trg.call(o.control));
                            } else {
                                el = Ext.net.getEl(trg);
                                if (Ext.isEmpty(el)) {
                                    el = trg.getEl ? trg.getEl() : null;
                                }
                                if (!el && o.control.el) {
                                    try {
                                        el = o.control.el.down(trg);
                                    } catch (e) {}
                                }
                                if (!el) {
                                    try {
                                        el = Ext.select(trg);
                                    } catch (e) {}
                                }
                            }
                            break;
                    }
                    if (!Ext.isEmpty(el)) {
                        var msg = Ext.isDefined(em.msg) ? em.msg : Ext.view.AbstractView.prototype.loadingText,
                            msgCls = em.msgCls || Ext.LoadMask.prototype.msgCls;
                        if (Ext.isEmpty(msg)) {
                            msgCls += " empty-eventmask";
                        }
                        el.mask(msg, msgCls);
                        o.maskEl = el;
                    }
                }
                o.failure = this.requestFailureHandler;
                o.success = this.requestSuccessHandler;
                o.url = Ext.net.ResourceMgr.resolveUrl(o.url);
            }
        }
    },
    requestSuccessHandler: function(response, options) {
        var o = options;
        this.removeMask(o);
        if (o.disableControl && o.control && Ext.isFunction(o.control.enable)) {
            o.control.enable();
        }
        var parsedResponse = o.scope.parseResponse(response, options);
        if (!Ext.isEmpty(parsedResponse.result.documentElement)) {
            this.executeScript(o, parsedResponse.result, response);
            return;
        }
        var result = parsedResponse.result,
            exception = parsedResponse.exception;
        if (o.control && o.control.afterDirectEvent) {
            o.control.afterDirectEvent(o, response, result);
        }
        if (result.success === false) {
            if (this.fireEvent("ajaxrequestexception", response, result, o.control, o.eventType, o.action, o.extraParams, o) === false) {
                o.cancelFailureWarning = true;
            }
            if (o.userFailure) {
                o.userFailure.call(o.control || window, response, result, o.control, o.eventType, o.action, o.extraParams, o);
            } else {
                if (o.showWarningOnFailure !== false && !o.cancelFailureWarning) {
                    var errorMsg = "";
                    if (!exception && result.errorMessage && result.errorMessage.length > 0) {
                        errorMsg = result.errorMessage;
                    }
                    o.scope.showFailure(response, errorMsg);
                }
            }
            if (o.userComplete) {
                o.userComplete.call(o.control || window, false, response, result, o.control, o.eventType, o.action, o.extraParams, o);
            }
            return;
        }
        if (!Ext.isEmpty(result.viewState) && o.form !== null) {
            o.scope.setValue(o.form.dom, "__VIEWSTATE", result.viewState);
            delete result.viewState;
            if (!Ext.isEmpty(result.viewStateEncrypted) && o.form !== null) {
                o.scope.setValue(o.form.dom, "__VIEWSTATEENCRYPTED", result.viewStateEncrypted);
                delete result.viewStateEncrypted;
            }
            if (!Ext.isEmpty(result.eventValidation) && o.form !== null) {
                o.scope.setValue(o.form.dom, "__EVENTVALIDATION", result.eventValidation);
                delete result.eventValidation;
            }
        }
        this.executeScript(o, result, response);
    },
    requestFailureHandler: function(response, options) {
        var o = options;
        this.removeMask(o);
        if (o.disableControl && o.control && Ext.isFunction(o.control.enable)) {
            o.control.enable();
        }
        if (o.control && o.control.afterDirectEvent) {
            o.control.afterDirectEvent(o, response);
        }
        if (this.fireEvent("ajaxrequestexception", response, {
                "errorMessage": response.statusText
            }, o.control, o.eventType, o.action, o.extraParams, o) === false) {
            o.cancelFailureWarning = true;
        }
        if (o.userFailure) {
            o.userFailure.call(o.control || window, response, {
                "errorMessage": response.responseText
            }, o.control, o.eventType, o.action, o.extraParams, o);
        } else if (o.showWarningOnFailure !== false && !o.cancelFailureWarning) {
            o.scope.showFailure(response, "");
        }
        if (o.userComplete) {
            o.userComplete.call(o.control || window, false, response, {
                "errorMessage": response.statusText
            }, o.control, o.eventType, o.action, o.extraParams, o);
        }
    },
    removeMask: function(o) {
        if (o.maskEl !== undefined && o.maskEl !== null) {
            var delay = 0,
                em = o.eventMask || {},
                remove, task;
            if (em && em.minDelay) {
                delay = em.minDelay;
            }
            remove = (em.target || "page") == "page";
            task = new Ext.util.DelayedTask(this.removeMaskDelay, o.scope, [o, remove]).delay(delay);
        }
    },
    removeMaskDelay: function(o, remove) {
        o.scope.delayedF(o.maskEl, remove);
    },
    executeScript: function(o, result, response) {
        var delay = 0,
            em = o.eventMask || {};
        if (em.minDelay) {
            delay = em.minDelay;
        }
        if (delay > 0) {
            var task = new Ext.util.DelayedTask(this.executeScriptDelay, o.scope, [o, result, response]).delay(delay);
        } else {
            this.executeScriptDelay.call(o.scope, o, result, response);
        }
    },
    executeScriptDelay: function(o, result, response) {
        if (result.script && result.script.length > 0) {
            if (window.execScript) {
                window.execScript(result.script);
            } else {
                window.eval.call(window, result.script);
            }
        }
        this.fireEvent("ajaxrequestcomplete", response, result, o.control, o.eventType, o.action, o.extraParams, o);
        if (o.userSuccess) {
            o.userSuccess.call(o.control || window, response, result, o.control, o.eventType, o.action, o.extraParams, o);
        }
        if (o.userComplete) {
            o.userComplete.call(o.control || window, true, response, result, o.control, o.eventType, o.action, o.extraParams, o);
        }
    }
});
Ext.net.DirectEvent.addEvents("beforeajaxrequest", "ajaxrequestcomplete", "ajaxrequestexception");
Ext.net.DirectEvent.request = Ext.Function.createSequence(Ext.net.DirectEvent.request, function(o) {
    if (!Ext.isEmpty(o.form) && Ext.net.ResourceMgr.isMVC !== true) {
        this.setValue(o.form.dom, "__EVENTTARGET", "");
        this.setValue(o.form.dom, "__EVENTARGUMENT", "");
    }
    if (o.formCfg) {
        Ext.removeNode(o.formCfg.form);
        delete o.formCfg;
    }
    if (!Ext.isEmptyObj(o._paramsFn)) {
        Ext.apply(o.extraParams, o._paramsFn);
        delete o._paramsFn;
    }
    if (o.after) {
        o.after(o.control, o.extraParams);
    }
});
Ext.net.directRequest = Ext.bind(Ext.net.DirectEvent.confirmRequest, Ext.net.DirectEvent);

Ext.net.DirectMethod = {
    request: function(name, options) {
        options = options || {};
        if (typeof options !== "object") {
            throw {
                message: "The DirectMethod options object is an invalid type: typeof " + typeof options
            };
        }
        var obj;
        if (!Ext.isEmpty(name) && typeof name === "object" && Ext.isEmptyObj(options)) {
            options = name;
        }
        if (options.params && options.json !== true) {
            for (var key in options.params) {
                if (options.params.hasOwnProperty(key)) {
                    obj = options.params[key];
                    if (obj === undefined) {
                        delete options.params[key];
                    } else if (obj && typeof obj === "object") {
                        options.params[key] = Ext.encode(obj);
                    }
                }
            }
        }
        obj = {
            name: options.cleanRequest ? undefined : (options.name || name),
            cleanRequest: options.cleanRequest,
            url: Ext.net.ResourceMgr.resolveUrl(options.url),
            control: Ext.isEmpty(options.control) ? null : {
                id: options.control
            },
            eventType: options.specifier || "public",
            type: options.type || "submit",
            method: options.method || "POST",
            eventMask: options.eventMask,
            extraParams: options.params,
            directMethodSuccess: options.success,
            directMethodFailure: options.failure,
            directMethodComplete: options.complete,
            viewStateMode: options.viewStateMode,
            isDirectMethod: true,
            userSuccess: function(response, result, control, eventType, action, extraParams, o) {
                if (o.successSeq) {
                    o.successSeq(response, result, control, eventType, action, extraParams, o);
                }
                result = !Ext.isDefined(result.result) ? (result.d || result) : result.result;
                if (!Ext.isEmpty(o.directMethodSuccess)) {
                    o.directMethodSuccess(result, response, extraParams, o);
                }
                if (!Ext.isEmpty(o.directMethodComplete)) {
                    o.directMethodComplete(true, result, response, extraParams, o);
                }
            },
            userFailure: function(response, result, control, eventType, action, extraParams, o) {
                if (o.failureSeq) {
                    o.failureSeq(response, result, control, eventType, action, extraParams, o);
                }
                if (!Ext.isEmpty(o.directMethodFailure)) {
                    o.directMethodFailure(result.errorMessage, response, extraParams, o);
                } else if (o.showFailureWarning !== false && o.cancelFailureWarning !== true) {
                    Ext.net.DirectEvent.showFailure(response, result.errorMessage);
                }
                if (!Ext.isEmpty(o.directMethodComplete)) {
                    o.directMethodComplete(false, result.errorMessage, response, extraParams, o);
                }
            }
        };
        return Ext.net.DirectEvent.request(Ext.apply(options, obj));
    }
};

Ext.net.ComponentManager = {
    registerId: function(cmp) {
        if (cmp.initDirectEvents) {
            cmp.initDirectEvents();
        }
        if (cmp.initialConfig || cmp.isStore || cmp.proxyId) {
            var cfg = cmp.initialConfig || {},
                id = cmp.isStore ? cmp.storeId : (cmp.proxyId || cfg.proxyId || cfg.id),
                ns = cmp.ns || (Ext.isArray(Ext.net.ResourceMgr.ns) ? Ext.net.ResourceMgr.ns[0] : Ext.net.ResourceMgr.ns),
                hasId = (!Ext.isEmpty(id, false) && id.indexOf("ext-comp-") !== 0);
            if (cmp.forbidIdScoping !== true && (hasId || (cmp.ns && !Ext.isEmpty(cmp.itemId, false)))) {
                if (ns) {
                    (Ext.isObject(ns) ? ns : Ext.ns(ns))[hasId ? id : cfg.itemId] = cmp;
                    cmp.nsId = (Ext.isObject(ns) ? "" : (ns + ".")) + (hasId ? id : cfg.itemId);
                } else {
                    window[id] = cmp;
                    cmp.nsId = id;
                }
            }
        }
    },
    unregisterId: function(cmp) {
        if (cmp.forbidIdScoping !== true) {
            var cfg = cmp.initialConfig || {},
                ns = cmp.ns || (Ext.isArray(Ext.net.ResourceMgr.ns) ? Ext.net.ResourceMgr.ns[0] : Ext.net.ResourceMgr.ns),
                id = cmp.proxyId || cmp.storeId || cmp.id,
                hasId = (!Ext.isEmpty(id, false) && id.indexOf("ext-comp-") !== 0),
                nsObj;
            if (!hasId && cfg.ns && cmp.itemId) {
                id = cmp.itemId;
            }
            if (ns && id) {
                if (Ext.isObject(ns) && ns[id]) {
                    try {
                        delete ns[id];
                    } catch (e) {
                        ns[id] = undefined;
                    }
                } else if (Ext.net.ResourceMgr.getCmp(ns + "." + id)) {
                    try {
                        delete Ext.ns(ns)[id];
                    } catch (e) {
                        Ext.ns(ns)[id] = undefined;
                    }
                }
            } else if (window[cmp.proxyId || cmp.storeId || cmp.id]) {
                window[cmp.proxyId || cmp.storeId || cmp.id] = null;
            }
            delete cmp.nsId;
        }
    }
};
Ext.ComponentManager.unregister = Ext.Function.createSequence(Ext.ComponentManager.unregister, function(component) {
    Ext.net.ComponentManager.unregisterId(component);
});
Ext.data.StoreManager.register = Ext.Function.createSequence(Ext.data.StoreManager.register, function() {
    for (var i = 0, s;
        (s = arguments[i]); i++) {
        Ext.net.ComponentManager.registerId(s);
    }
});
Ext.data.StoreManager.unregister = Ext.Function.createSequence(Ext.data.StoreManager.unregister, function() {
    for (var i = 0, s;
        (s = arguments[i]); i++) {
        Ext.net.ComponentManager.unregisterId(s);
    }
});
(function(fn) {
    Ext.PluginManager.create = function() {
        var p = fn.apply(Ext.PluginManager, arguments);
        Ext.net.ComponentManager.registerId(p);
        if (Ext.isFunction(p.on)) {
            p.on("destroy", function() {
                Ext.net.ComponentManager.unregisterId(this);
            });
        }
        return p;
    };
})(Ext.PluginManager.create)
Ext.ComponentManager.onAvailable = function(id, fn, scope) {
    var all = this.all,
        item, callback;
    if (all.containsKey(id)) {
        item = all.get(id);
        fn.call(scope || item, item);
    } else {
        callback = function(map, key, item) {
            if (key == id) {
                fn.call(scope || item, item);
                item.on("destroy", function() {
                    Ext.Function.defer(all.un, 1, all, ["add", callback]);
                })
            }
        };
        all.on('add', callback);
    }
};

Ext.override(Ext.AbstractComponent, {
    selectable: true,
    autoFocusDelay: 10,
    styleHtmlCls: 'x-html',
    onRender: function() {
        this.callParent(arguments);
        if (this.callouts) {
            var callouts = this.callouts,
                callout, i;
            delete this.callouts;
            for (i = 0; i < callouts.length; i++) {
                callout = callouts[i];
                callout.target = this;
                Ext.create("Ext.net.Callout", callout);
            }
        }
        if (this.tooltips) {
            var tooltips = [],
                tooltip, i;
            for (i = 0; i < this.tooltips.length; i++) {
                tooltip = this.tooltips[i];
                if (!tooltip.target) {
                    tooltip.target = this.el;
                }
                tooltips.push(Ext.ComponentManager.create(tooltip, "tooltip"));
            }
            this.tooltips = tooltips;
        }
    },
    afterRender: function() {
        this.callParent(arguments);
        if (this.styleHtmlContent) {
            this.getTargetEl().addCls(this.styleHtmlCls);
        }
    },
    initComponent: function() {
        var cmp, i, len;
        if (this.hasId()) {
            cmp = Ext.getCmp(this.id);
            if (cmp) {
                cmp.destroy();
            }
        }
        if (this.contentHtml && Ext.isFunction(this.contentHtml)) {
            this.contentHtml.call(window);
        }
        if (this.preinitFn) {
            this.preinitFn.call(this.preinitScope || this, this);
        }
        if (this.tag) {
            this.setTag(this.tag);
        }
        Ext.net.ComponentManager.registerId(this);
        if (this.bin) {
            for (i = 0, len = this.bin.length; i < len; i++) {
                this.bin[i].binOwner = this;
            }
        }
        this.callParent(arguments);
    },
    hasId: function() {
        return !!(this.initialConfig && this.initialConfig.id);
    },
    isNonContentable: function() {
        return this.isXType("tablepanel") || this.isXType("dataview") || this.isXType("field") || this.isXType("draw") || this.isXType("chart") || this.isXType("button");
    },
    destroyContentWidgets: function(checkFlag) {
        if ((this.destroyContent || !checkFlag) && !this.isNonContentable()) {
            var contentEl = this.getContentTarget();
            if (contentEl && contentEl.dom) {
                this.destroyFromDom(contentEl.dom);
            }
        }
    },
    beforeDestroy: function() {
        this.destroyContentWidgets(true);
    },
    destroyFromDom: function(dom) {
        if (!dom) {
            return;
        }
        var children = dom.children,
            child, cmp, id, len, i;
        for (i = 0, len = children.length; i < len; i++) {
            child = children[i];
            if (child) {
                id = child.id;
                if (!Ext.isEmpty(id)) {
                    cmp = Ext.getCmp(id);
                    if (cmp) {
                        cmp.destroyContent = true;
                        if (!cmp.isDescendantOf(this)) {
                            cmp.destroy();
                        } else {
                            cmp.destroyContentWidgets(true);
                        }
                    } else {
                        this.destroyFromDom(child);
                    }
                } else {
                    this.destroyFromDom(child);
                }
            }
        }
    },
    destroy: function() {
        this.destroyBin();
        this.destroyTooltips();
        this.destroyCallouts();
        this.callParent(arguments);
    },
    destroyCallouts: function() {
        if (this.callouts) {
            for (i = 0; i < this.callouts.length; i++) {
                var callout = this.callouts[i];
                if (!callout.isDestroyed) {
                    callout.destroyFromCmp = true;
                    callout.destroy();
                }
            }
            delete this.callouts;
        }
    },
    destroyTooltips: function() {
        if (this.tooltips) {
            for (i = 0; i < this.tooltips.length; i++) {
                var tooltip = this.tooltips[i];
                if (!tooltip.isDestroyed && Ext.isFunction(tooltip.destroy)) {
                    tooltip.destroy();
                }
            }
            delete this.tooltips;
        }
    },
    destroyBin: function() {
        if (this.bin) {
            Ext.destroy(this.bin);
        }
        delete this.bin;
    },
    setSelectable: function(selectable) {
        if (selectable === false) {
            this.setDisabled(true).el.removeCls("x-item-disabled").applyStyles("color:black;");
        } else if (selectable === true) {
            this.setDisabled(false);
        }
        this.selectable = false;
        return this;
    },
    addPlugins: function(plugins) {
        if (Ext.isEmpty(this.plugins)) {
            this.plugins = [];
        } else if (!Ext.isArray(this.plugins)) {
            this.plugins = [this.plugins];
        }
        if (Ext.isArray(plugins)) {
            for (var i = 0; i < plugins.length; i++) {
                this.plugins.push(this.initPlugin(plugins[i]));
            }
        } else {
            this.plugins.push(this.initPlugin(plugins));
        }
    },
    getForm: function(id) {
        var form = Ext.isEmpty(id) ? this.el.up("form") : Ext.get(id);
        if (!Ext.isEmpty(form)) {
            Ext.apply(form, form.dom);
            form.submit = function() {
                form.dom.submit();
            };
        }
        return form;
    },
    setAnchor: function(anchor, doLayout) {
        this.anchor = anchor;
        delete this.anchorSpec;
        if (doLayout && this.ownerCt) {
            this.ownerCt.doLayout();
        }
    },
    getLoader: function() {
        var me = this,
            autoLoad = me.autoLoad ? (Ext.isObject(me.autoLoad) ? me.autoLoad : {
                url: me.autoLoad
            }) : null,
            loader = me.loader || autoLoad;
        if (loader) {
            if (!loader.isLoader) {
                me.loader = Ext.create('Ext.net.ComponentLoader', Ext.apply({
                    target: me,
                    autoLoad: autoLoad
                }, loader));
            } else {
                loader.setTarget(me);
            }
            return me.loader;
        }
        return null;
    },
    getTagHiddenField: function() {
        if (!this.tagHiddenField && (this.hasId() || this.tagHiddenName)) {
            this.tagHiddenField = new Ext.form.Hidden({
                name: this.tagHiddenName || (this.id + "_tag")
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.tagHiddenField);
            this.on("afterrender", function() {
                this.tagHiddenField.render(this.el.parent() || this.el);
            }, this, {
                single: true
            });
        }
        return this.tagHiddenField;
    },
    setTag: function(tag) {
        var field = this.getTagHiddenField();
        if (field) {
            field.setValue(escape(Ext.encode(tag)));
        }
        this.tag = tag;
    },
    getTag: function() {
        return this.tag;
    },
    replace: function(cmp) {
        if (this.ownerCt) {
            var index = this.ownerCt.items.indexOf(this),
                ct = this.ownerCt;
            ct.remove(this, true);
            if (Ext.isFunction(cmp)) {
                cmp({
                    mode: "item",
                    index: index,
                    ct: ct
                });
            } else {
                ct.insert(index, cmp);
            }
        } else {
            var container = this.el.dom.parentNode,
                position = this.el.next();
            this.destroy();
            if (!position || !position.dom) {
                position = undefined;
            }
            if (Ext.isFunction(cmp)) {
                cmp({
                    mode: "el",
                    position: position,
                    ct: container
                });
            } else {
                cmp = Ext.ComponentManager.create(cmp);
                cmp.render(container, position);
            }
        }
    },
    getBinComponent: function(comp) {
        var me = this,
            item = null;
        if (me.bin) {
            if (Ext.isNumber(comp)) {
                item = me.bin[comp];
            } else if (Ext.isString(comp)) {
                Ext.each(me.bin, function(binItem) {
                    if (binItem.itemId === comp || binItem.id === comp || binItem.storeId === comp || binItem.proxyId === comp) {
                        item = binItem;
                        return false;
                    }
                });
            }
        }
        return item;
    }
});

Ext.override(Ext.Component, {
    initComponent: function() {
        this.callParent(arguments);
        if (!Ext.isEmpty(this.contextMenuId, false)) {
            this.on("render", function() {
                this.mon(this.el, "contextmenu", function(e, t) {
                    var menu = Ext.menu.MenuMgr.get(this.contextMenuId);
                    menu.contextEvent = {
                        e: e,
                        t: t
                    };
                    e.stopEvent();
                    e.preventDefault();
                    menu.showAt(e.getXY());
                }, this);
            }, this, {
                single: true
            });
        }
        if (this.iconCls) {
            X.net.RM.setIconCls(this, "iconCls");
        }
        if (!Ext.isEmpty(this.defaultAnchor, true)) {
            if (Ext.isEmpty(this.defaults)) {
                this.defaults = {};
            }
            Ext.apply(this.defaults, {
                anchor: this.defaultAnchor
            });
        }
        if (this.selectable === false) {
            this.on("afterrender", function() {
                this.setSelectable(false);
            });
        }
        if (this.autoFocus) {
            if (this.ownerCt) {
                this.mon(this.ownerCt, "afterlayout", function() {
                    this.focus(this.selectOnFocus || false);
                }, this, {
                    delay: this.autoFocusDelay
                });
            } else {
                this.on("afterrender", function() {
                    this.focus(this.selectOnFocus || false);
                }, this, {
                    delay: this.autoFocusDelay
                });
            }
        }
        if (this.postback) {
            this.on("afterrender", function() {
                this.on(this.postback.eventName, this.postback.fn, this, {
                    delay: 30
                });
            });
        }
    },
    afterRender: function() {
        this.callParent(arguments);
        if (this.keyMap && !this.keyMap.addBinding) {
            this.keyMap = new Ext.util.KeyMap(Ext.apply({
                target: this.keyMap.componentEvent ? this : (this.keyMap.cmpEl ? this[this.keyMap.cmpEl] : this.el)
            }, this.keyMap));
            if (this instanceof Ext.window.Window) {
                this._keyMap = this.keyMap;
                delete this.keyMap;
            }
        }
        if (this.keyNav && !Ext.isFunction(this.keyNav.destroy)) {
            this.keyNav = new Ext.util.KeyNav(Ext.apply({
                target: this.keyMap.componentEvent ? this : (this.keyMap.cmpEl ? this[this.keyMap.cmpEl] : this.el)
            }, this.keyNav));
        }
    },
    onDestroy: function() {
        if (this.rendered && (this.keyMap || this._keyMap)) {
            (this._keyMap || this.keyMap).destroy();
            delete this._keyMap;
            delete this.keyMap;
        }
        if (this.rendered && this.keyNav && this.keyNav.map) {
            this.keyNav.destroy();
            delete this.keyNav;
        }
        this.callParent(arguments);
    }
});

Ext.ComponentLoader.Renderer.Data = function(loader, response, active) {
    var success = true;
    try {
        loader.getTarget().update((Ext.isObject(response.responseText) || Ext.isArray(response.responseText)) ? response.responseText : Ext.decode(response.responseText));
    } catch (e) {
        success = false;
    }
    return success;
};
Ext.ComponentLoader.Renderer.Component = function(loader, response, active) {
    var success = true,
        target = loader.getTarget(),
        items = [];
    if (!target.isContainer) {
        Ext.Error.raise({
            target: target,
            msg: 'Components can only be loaded into a container'
        });
    }
    try {
        items = (Ext.isObject(response.responseText) || Ext.isArray(response.responseText)) ? response.responseText : Ext.decode(response.responseText);
    } catch (e) {
        success = false;
    }
    if (success) {
        target.suspendLayouts();
        if (active.removeAll) {
            target.removeAll();
        }
        target.add(items);
        target.resumeLayouts(true);
    }
    return success;
}
Ext.ComponentLoader.Renderer.Script = function(loader, response, active) {
    var success = true;
    try {
        if (window.execScript) {
            window.execScript(response.responseText);
        } else {
            window.eval.call(window, response.responseText);
        }
    } catch (e) {
        success = false;
    }
    return success;
};
Ext.define('Ext.net.ComponentLoader', {
    extend: 'Ext.ComponentLoader',
    autoLoad: true,
    removeD: false,
    constructor: function(config) {
        config = config || {};
        var autoLoad = config.autoLoad;
        config.autoLoad = false;
        Ext.net.ComponentLoader.superclass.constructor.call(this, config);
        if (autoLoad !== false) {
            this.autoLoad = true;
        }
        this.initLoader();
    },
    addMask: function(mask) {
        if (this.target.floating) {
            if (mask.showMask) {
                (this.target.body || this.target.el).mask(mask.msg || Ext.view.AbstractView.prototype.loadingText, mask.msgCls || "x-mask-loading");
            }
            return;
        }
        this.callParent(arguments);
    },
    removeMask: function() {
        if (this.target.floating) {
            (this.target.body || this.target.el).unmask();
            return;
        }
        this.callParent(arguments);
    },
    getLocation: function(href) {
        var l = document.createElement("a");
        l.href = href;
        return l;
    },
    isIFrame: function(cfg) {
        var frame = false;
        if (cfg.renderer == "frame") {
            return true;
        }
        if (typeof cfg == "string" && cfg.indexOf("://") >= 0 && this.getLocation(cfg).host != window.location.host) {
            frame = true;
        } else if (cfg.url && cfg.url.indexOf("://") >= 0 && this.getLocation(cfg.url).host != window.location.host) {
            frame = true;
        }
        return frame;
    },
    initLoader: function() {
        if (this.isIFrame(this)) {
            var target = this.getTarget();
            if (!target.isContainer) {
                throw 'IFrame can only be loader to a container';
            }
            target.layout = "fit";
            this.renderer = "frame";
        }
        var loadConfig = {
                delay: 10,
                single: true
            },
            triggerCmp, triggerControl = this.triggerControl || this.getTarget(),
            triggerEvent = this.triggerEvent;
        if (Ext.isFunction(triggerControl)) {
            triggerControl = triggerControl.call(window);
        } else if (Ext.isString(triggerControl)) {
            triggerCmp = Ext.net.ResourceMgr.getCmp(triggerControl);
            if (triggerCmp) {
                triggerControl = triggerCmp;
            } else {
                triggerControl = Ext.net.getEl(triggerControl);
            }
        }
        loadConfig.single = !(this.reloadOnEvent || false);
        if (this.autoLoad) {
            triggerControl.on(triggerEvent || "afterlayout", function() {
                this.load({});
            }, this, loadConfig);
        }
    },
    load: function(options) {
        if (Ext.isString(options)) {
            options = {
                url: options
            };
        } else {
            options = Ext.apply({}, options);
        }
        this.lastOptions = options;
        if (this.paramsFn) {
            this.params = this.paramsFn.call(this.paramsFnScope || this.getTarget());
        }
        if (options.paramsFn) {
            options.params = Ext.apply(options.params || {}, options.paramsFn.call(this.paramsFnScope || this.getTarget()));
        }
        if (!Ext.isDefined(options.passParentSize) && this.passParentSize) {
            options.params = options.params || {};
            options.params.width = (this.target.body || this.target.el).getWidth(true);
            options.params.height = (this.target.body || this.target.el).getHeight(true);
        }
        if (this.renderer == "frame") {
            this.loadFrame(options);
            return;
        }
        if (this.directMethod) {
            var me = this,
                mask = Ext.isDefined(options.loadMask) ? options.loadMask : me.loadMask,
                params = Ext.apply({}, options.params),
                callback = options.callback || me.callback,
                scope = options.scope || me.scope || me,
                method, dmCfg;
            Ext.applyIf(params, me.params);
            Ext.apply(params, me.baseParams);
            Ext.apply(options, {
                scope: me,
                params: params,
                callback: me.onComplete
            });
            if (me.fireEvent('beforeload', me, options) === false) {
                return;
            }
            if (mask) {
                me.addMask(mask);
            }
            method = Ext.decode(this.directMethod);
            dmCfg = {
                complete: function(success, result, response) {
                    me.onComplete(options, success, {
                        responseText: result
                    });
                }
            }
            if (method.length > 1) {
                method(Ext.encode(options.params), dmCfg);
            } else {
                method(dmCfg);
            }
            me.active = {
                options: options,
                mask: mask,
                scope: scope,
                callback: callback,
                success: options.success || me.success,
                failure: options.failure || me.failure,
                renderer: options.renderer || me.renderer,
                scripts: Ext.isDefined(options.scripts) ? options.scripts : me.scripts
            };
            me.setOptions(me.active, options);
            return;
        }
        Ext.net.ComponentLoader.superclass.load.apply(this, arguments);
    },
    loadFrame: function(options) {
        options = Ext.apply({}, options);
        var me = this,
            target = me.target,
            mask = Ext.isDefined(options.loadMask) ? options.loadMask : me.loadMask,
            monitorComplete = Ext.isDefined(options.monitorComplete) ? options.monitorComplete : me.monitorComplete,
            disableCaching = Ext.isDefined(options.disableCaching) ? options.disableCaching : me.disableCaching,
            disableCachingParam = options.disableCachingParam || "_dc",
            params = Ext.apply({}, options.params),
            callback = options.callback || me.callback,
            scope = options.scope || me.scope || me;
        Ext.applyIf(params, me.params);
        Ext.apply(params, me.baseParams);
        Ext.applyIf(options, {
            url: me.url
        });
        Ext.apply(options, {
            mask: mask,
            monitorComplete: monitorComplete,
            disableCaching: disableCaching,
            params: params,
            callback: callback,
            scope: scope
        });
        this.lastOptions = options;
        if (!options.url) {
            throw 'No URL specified';
        }
        if (me.fireEvent('beforeload', me, options) === false) {
            return;
        }
        var url = options.url;
        if (disableCaching !== false) {
            url = url + ((url.indexOf("?") > -1) ? "&" : "?") + disableCachingParam + "=" + new Date().getTime();
        }
        if (!Ext.Object.isEmpty(params)) {
            var p = {};
            for (var key in params) {
                var ov = params[key];
                if (typeof ov == "function") {
                    p[key] = ov.call(target);
                } else {
                    p[key] = ov;
                }
            }
            p = Ext.urlEncode(p);
            url = url + ((url.indexOf("?") > -1) ? "&" : "?") + p;
        }
        if (mask) {
            me.addMask(mask);
        }
        if (Ext.isEmpty(target.iframe)) {
            var iframeObj = {
                    tag: "iframe",
                    id: target.id + "_IFrame",
                    name: target.id + "_IFrame",
                    src: url,
                    frameborder: 0
                },
                layout = target.getLayout();
            if (!target.layout || target.layout.type !== "fit") {
                target.setLayout(Ext.layout.Layout.create("fit"));
            }
            target.removeAll(true);
            var p = target,
                iframeCt = {
                    xtype: "component",
                    autoEl: iframeObj,
                    listeners: {
                        afterrender: function() {
                            var owner = this.ownerCt;
                            owner.iframe = this.el;
                            if (monitorComplete) {
                                owner.getLoader().startIframeMonitoring();
                            } else {
                                this.el.on("load", owner.getLoader().afterIFrameLoad, owner.getLoader());
                            }
                            owner.getLoader().beforeIFrameLoad(options);
                        }
                    }
                };
            target.add(iframeCt);
        } else {
            target.iframe.dom.src = Ext.String.format("java{0}", "script:false");
            try {
                window.frames[target.iframe.dom.name].location.replace(url);
            } catch (e) {
                target.iframe.dom.src = url;
            }
            this.beforeIFrameLoad(options);
        }
        if (!this.destroyIframeOnUnload) {
            this.destroyIframeOnUnload = true;
        }
    },
    iframeCompleteCheck: function() {
        if (this.target.iframe.dom.readyState == "complete") {
            this.stopIframeMonitoring();
            this.afterIFrameLoad();
        }
    },
    startIframeMonitoring: function() {
        if (this.iframeTask) {
            this.iframeTask.stopAll();
            this.iframeTask = null;
        }
        this.iframeTask = new Ext.util.TaskRunner();
        this.iframeTask.start({
            run: this.iframeCompleteCheck,
            interval: 200,
            scope: this
        });
    },
    stopIframeMonitoring: function() {
        if (this.iframeTask) {
            this.iframeTask.stopAll();
            this.iframeTask = null;
        }
    },
    beforeIFrameLoad: function() {
        try {
            this.target.iframe.dom.contentWindow.parentAutoLoadControl = this.target;
        } catch (e) {}
    },
    afterIFrameLoad: function() {
        var options = this.lastOptions;
        if (options.mask) {
            this.removeMask();
        }
        try {
            this.target.iframe.dom.contentWindow.parentAutoLoadControl = this.target;
        } catch (e) {}
        if (options.callback) {
            Ext.callback(options.callback, options.scope, [this, true, null, options]);
        }
        if (options.success) {
            Ext.callback(options.success, options.scope, [this, true, null, options]);
        }
        this.target.onIFrameLoad();
        this.fireEvent("load", this, null, options);
    },
    getRenderer: function(renderer) {
        if (Ext.isFunction(renderer)) {
            return renderer;
        }
        switch (renderer) {
            case 'component':
                return Ext.ComponentLoader.Renderer.Component;
            case 'data':
                return Ext.ComponentLoader.Renderer.Data;
            case 'script':
                return Ext.ComponentLoader.Renderer.Script;
            default:
                return Ext.ElementLoader.Renderer.Html;
        }
    },
    onComplete: function(options, success, response, decodedResp) {
        var me = this,
            text, cfg, resp, active = me.active,
            scope, renderer;
        if (active) {
            scope = active.scope;
            renderer = me.getRenderer(active.renderer);
            if (success && !decodedResp && (this.removeD || (active && active.options && active.options.url && active.options.url.indexOf(".asmx") > 0))) {
                try {
                    text = response.responseText.replace(/{"d":null}$/, "");
                    cfg = Ext.decode(text, true);
                    if (cfg && cfg.d) {
                        text = cfg.d;
                    } else if (active.renderer === "component") {
                        text = cfg;
                    }
                } catch (e) {
                    success = false;
                }
                resp = {
                    responseText: text
                };
            } else {
                resp = response;
            }
            if (success && !decodedResp && active.renderer === "component") {
                if (Ext.isObject(resp.responseText)) {
                    cfg = resp.responseText;
                } else if (Ext.isString(resp.responseText)) {
                    cfg = Ext.decode(resp.responseText);
                    resp.responseText = cfg;
                } else {
                    cfg = null;
                }
                if (cfg && cfg['x.res']) {
                    if (cfg['x.res'].ns) {
                        Ext.ns.apply(Ext, cfg['x.res'].ns);
                    }
                    if (cfg.config) {
                        resp.responseText = cfg.config;
                    }
                    if (cfg['x.res'].res) {
                        Ext.net.ResourceMgr.load(cfg['x.res'].res, Ext.Function.bind(this.onComplete, this, [options, success, response, resp]));
                    }
                    return;
                }
            }
            if (success) {
                success = renderer.call(me, me, decodedResp || resp, active) !== false;
            }
            if (success) {
                Ext.callback(active.success, scope, [me, response, options]);
                me.fireEvent('load', me, response, options);
            } else {
                Ext.callback(active.failure, scope, [me, response, options]);
                me.fireEvent('exception', me, response, options);
                if (this.showWarningOnFailure !== false && !this.hasListener("exception")) {
                    Ext.net.DirectEvent.showFailure(response, response.responseText);
                }
            }
            Ext.callback(active.callback, scope, [me, success, response, options]);
            if (active.mask) {
                me.removeMask();
            }
        }
        delete me.active;
    }
});

Ext.container.AbstractContainer.prototype.initComponent = Ext.Function.createSequence(Ext.container.AbstractContainer.prototype.initComponent, function() {
    if (this.autoDoLayout === true) {
        this.on("afterrender", this.doLayout, this, {
            delay: 10
        });
    }
});

Ext.Container.override({
    getBody: function(focus) {
        if (this.iframe) {
            var self = this.getWin();
            if (focus !== false) {
                try {
                    self.focus();
                } catch (e) {}
            }
            return self;
        }
        return Ext.get(this.id + "_Content") || this.layout.getRenderTarget() || this.getTargetEl();
    },
    reload: function(disableCaching) {
        var loader = this.getLoader();
        loader.load(Ext.applyIf({
            disableCaching: disableCaching
        }, loader.lastOptions || {}));
    },
    load: function(config) {
        this.getLoader().load(config);
    },
    clearContent: function() {
        if (this.iframe && this.iframe.dom) {
            var me = this,
                doc, prop;
            this.iframe.un("load", this.getLoader().afterIFrameLoad, this);
            try {
                doc = me.getDoc();
                if (doc) {
                    if (!Ext.isIE) {
                        Ext.EventManager.removeAll(doc);
                    }
                    for (prop in doc) {
                        if (doc.hasOwnProperty && doc.hasOwnProperty(prop)) {
                            delete doc[prop];
                        }
                    }
                }
                this.iframe.dom.contentWindow.parentAutoLoadControl = null;
            } catch (e) {}
            try {
                this.iframe.dom.src = Ext.SSL_SECURE_URL;
                Ext.destroy(this.iframe);
                delete this.iframe;
                this.removeAll(true);
            } catch (e) {}
            this.getLoader().removeMask();
        } else if (this.rendered) {
            this.update("");
        }
    },
    beforeDestroy: function() {
        if (this.iframe && this.iframe.dom) {
            try {
                this.clearContent();
            } catch (e) {}
        }
        this.destroyContentWidgets(true);
        this.destroyContentWidgets = Ext.emptyFn;
        this.callParent(arguments);
    },
    onRender: Ext.Function.createSequence(Ext.container.Container.prototype.onRender, function() {
        this.mon(this.el, Ext.EventManager.getKeyEvent(), this.fireKey, this);
    }),
    fireKey: function(e) {
        if (e.getKey() === e.ENTER) {
            var tagRe = /textarea/i,
                target = e.target;
            contentEditable = target.contentEditable;
            if (tagRe.test(target.tagName) || (contentEditable === '' || contentEditable === 'true')) {
                return;
            }
            var btn, index, fbar = this.child("[ui='footer']"),
                dbtn = this.defaultButton;
            if (!dbtn) {
                if (!(this instanceof Ext.form.Panel) || !fbar || !fbar.items || !(fbar.items.last() instanceof Ext.button.Button) || Ext.fly(target).hasCls(Ext.button.Button.prototype.baseCls)) {
                    return;
                }
                btn = fbar.items.last();
                this.clickButton(btn, e);
                return;
            }
            if (Ext.isNumeric(dbtn)) {
                index = parseInt(dbtn, 10);
                if (!fbar || !fbar.items || !(fbar.items.getAt(index) instanceof Ext.button.Button)) {
                    return;
                }
                btn = fbar.items.getAt(index);
                this.clickButton(btn, e);
            } else {
                btn = Ext.getCmp(dbtn);
                if (!btn) {
                    btn = this.down(dbtn);
                }
                if (btn) {
                    this.clickButton(btn, e);
                }
            }
        }
    },
    clickButton: function(btn, e) {
        if (this.defaultButtonStopEvent !== false) {
            e.stopEvent();
        }
        if (btn.onClick) {
            e.button = 0;
            btn.onClick(e);
        } else {
            btn.fireEvent("click", btn, e);
        }
    },
    beforeWindowUnload: function() {
        var me = this,
            doc, prop;
        if (me.rendered) {
            try {
                doc = me.getDoc();
                if (doc) {
                    if (!Ext.isIE) {
                        Ext.EventManager.removeAll(doc);
                    }
                    for (prop in doc) {
                        if (doc.hasOwnProperty && doc.hasOwnProperty(prop)) {
                            delete doc[prop];
                        }
                    }
                }
            } catch (e) {}
        }
    },
    onIFrameLoad: function() {
        var me = this,
            doc = me.getDoc(),
            fn = me.onIFrameRelayedEvent;
        if (doc) {
            if (!Ext.isIE) {
                try {
                    Ext.EventManager.removeAll(doc);
                    Ext.EventManager.on(doc, {
                        mousedown: fn,
                        mousemove: fn,
                        mouseup: fn,
                        click: fn,
                        dblclick: fn,
                        scope: me
                    });
                } catch (e) {}
            }
            if (!this._unloadListener) {
                this._unloadListener = true;
                Ext.EventManager.on(window, 'unload', me.beforeWindowUnload, me);
            }
        }
    },
    onIFrameRelayedEvent: function(event) {
        if (!this.iframe) {
            return;
        }
        var iframeEl = this.iframe,
            iframeXY = Ext.Element.getTrueXY(iframeEl),
            originalEventXY = event.getXY(),
            eventXY = Ext.EventManager.getPageXY(event.browserEvent);
        event.xy = [iframeXY[0] + eventXY[0], iframeXY[1] + eventXY[1]];
        event.injectEvent(iframeEl);
        event.xy = originalEventXY;
    },
    getFrameBody: function() {
        var doc = this.getDoc();
        return doc.body || doc.documentElement;
    },
    getDoc: function() {
        try {
            return this.getWin().document;
        } catch (ex) {
            return null;
        }
    },
    getWin: function() {
        var me = this,
            name = me.id + "_IFrame",
            win = Ext.isIE ? me.iframe.dom.contentWindow : window.frames[name];
        return win;
    },
    getFrame: function() {
        var me = this;
        return me.iframe.dom;
    }
});

Ext.panel.Panel.override({
    initComponent: function() {
        if (this.tbar && (this.tbar.xtype == "paging") && !Ext.isDefined(this.tbar.store) && this.store) {
            this.tbar.store = this.store;
        }
        if (this.bbar && (this.bbar.xtype == "paging") && !Ext.isDefined(this.bbar.store) && this.store) {
            this.bbar.store = this.store;
        }
        this.callParent(arguments);
        this.on("collapse", function() {
            var f = this.getCollapsedField();
            if (f) {
                f.el.dom.value = "true";
            }
        }, this);
        this.on("expand", function() {
            var f = this.getCollapsedField();
            if (f) {
                f.el.dom.value = "false";
            }
        }, this);
    },
    getCollapsedField: function() {
        if (!this.collapsedField && this.hasId()) {
            this.collapsedField = new Ext.form.Hidden({
                id: this.id + "_Collapsed",
                name: this.id + "_Collapsed",
                value: this.collapsed || false
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.collapsedField);
            if (this.hasId()) {
                this.collapsedField.render(this.el.parent() || this.el);
            }
        }
        return this.collapsedField;
    },
    setIconCls: function(cls) {
        this.callParent([cls && cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls]);
    },
    setIcon: function(icon) {
        if (this.iconCls) {
            this.setIconCls("");
        }
        this.callParent([icon && icon.indexOf('#') === 0 ? X.net.RM.getIconUrl(icon.substring(1)) : icon]);
    }
});
Ext.Panel.prototype.initComponent = Ext.Function.createInterceptor(Ext.Panel.prototype.initComponent, function() {
    if (this.tbar && (this.tbar.xtype == "paging") && !Ext.isDefined(this.tbar.store) && this.store) {
        this.tbar.store = this.store;
    }
    if (this.bbar && (this.bbar.xtype == "paging") && !Ext.isDefined(this.bbar.store) && this.store) {
        this.bbar.store = this.store;
    }
});
Ext.panel.Header.override({
    setIconCls: function(cls) {
        this.callParent([cls && cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls]);
    },
    setIcon: function(icon) {
        if (this.iconCls) {
            this.setIconCls("");
        }
        this.callParent([icon && icon.indexOf('#') === 0 ? X.net.RM.getIconUrl(icon.substring(1)) : icon]);
    }
});

Ext.window.Window.override({
    closeAction: "hide",
    defaultRenderTo: "body",
    initialAlphaNum: /^[a-z0-9]/i,
    initComponent: function() {
        this.callParent(arguments);
        if (Ext.isIE && this.modal) {
            this.on("show", function() {
                this.zIndexManager._onContainerResize();
            }, this, {
                delay: 10
            });
        }
    },
    initContainer: function(container) {
        var me = this;
        if (!container && me.el) {
            container = me.el.dom.parentNode;
            me.allowDomMove = false;
        }
        me.container = container.dom ? container : Ext.get(container);
        if (this.container.dom == (Ext.net.ResourceMgr.getAspForm() || {}).dom) {
            me.container = Ext.getBody();
        }
        return me.container;
    },
    onAdded: function() {
        this.callParent(arguments);
        if (this.initialConfig && this.initialConfig.hidden === false && this.ownerCt) {
            if (this.ownerCt.rendered) {
                this.show();
            } else {
                this.ownerCt.on("afterlayout", function() {
                    this.show();
                }, this, {
                    single: true,
                    delay: 10
                });
            }
        }
    },
    render: function(container, position) {
        var me = this,
            el = me.el && (me.el = Ext.get(me.el)),
            tree, nextSibling;
        Ext.suspendLayouts();
        container = container.dom ? container : Ext.get(container);
        var newcontainer = me.initContainer(container);
        if (container.dom != (Ext.net.ResourceMgr.getAspForm() || {}).dom) {
            container = newcontainer;
        }
        nextSibling = me.getInsertPosition(position);
        if (!el) {
            tree = me.getRenderTree();
            if (nextSibling) {
                el = Ext.DomHelper.insertBefore(nextSibling, tree);
            } else {
                el = Ext.DomHelper.append(container, tree);
            }
            me.wrapPrimaryEl(el);
        } else {
            me.initStyles(el);
            if (me.allowDomMove !== false) {
                if (nextSibling) {
                    container.dom.insertBefore(el.dom, nextSibling);
                } else {
                    container.dom.appendChild(el.dom);
                }
            }
        }
        me.finishRender(position);
        Ext.resumeLayouts(!container.isDetachedBody);
        if (me.initialConfig && me.initialConfig.hidden === false) {
            me.toFront();
        }
    },
    afterLayout: function() {
        var me = this;
        this.callParent(arguments);
        if (!me._initCentered && me.initialConfig && me.initialConfig.hidden === false && !Ext.isDefined(me.initialConfig.pageX) && !Ext.isDefined(me.initialConfig.pageY) && !Ext.isDefined(me.initialConfig.x) && !Ext.isDefined(me.initialConfig.y)) {
            me._initCentered = true;
            me.center();
        }
    },
    doAutoRender: function() {
        var me = this;
        if (!me.rendered) {
            var form = Ext.net.ResourceMgr.getAspForm(),
                ct = ((this.defaultRenderTo === "body" || !form) ? Ext.getBody() : form);
            if (me.floating) {
                me.render(ct);
            } else {
                me.render(Ext.isBoolean(me.autoRender) ? ct : me.autoRender);
            }
        }
    },
    maximize: function(animate) {
        var me = this,
            header = me.header,
            tools = me.tools,
            changed;
        if (!me.maximized) {
            me.expand(false);
            if (!me.hasSavedRestore) {
                me.restoreSize = me.getSize();
                me.restorePos = me.getPosition(false);
            }
            if (header) {
                header.suspendLayouts();
                if (tools.maximize) {
                    tools.maximize.hide();
                    changed = true;
                }
                if (tools.restore) {
                    tools.restore.show();
                    changed = true;
                }
                if (me.collapseTool) {
                    me.collapseTool.hide();
                    changed = true;
                }
                me.resumeHeaderLayout(changed);
            }
            me.maximized = true;
            me.el.disableShadow();
            if (me.dd) {
                me.dd.disable();
                if (header) {
                    header.removeCls(header.indicateDragCls)
                }
            }
            if (me.resizer) {
                me.resizer.disable();
            }
            me.el.addCls(Ext.baseCSSPrefix + 'window-maximized');
            me.container.addCls(Ext.baseCSSPrefix + 'window-maximized-ct');
            me.syncMonitorWindowResize();
            me.fitContainer(animate = (animate || !!me.animateTarget) ? {
                callback: function() {
                    me.fireEvent('maximize', me);
                }
            } : null);
            if (!animate) {
                me.fireEvent('maximize', me);
            }
        }
        return me;
    },
    fitContainer: function(animate) {
        var me = this,
            parent = me.floatParent,
            container = parent ? parent.getTargetEl() : me.container,
            newBox = container.getViewSize(false),
            newPosition = container.getXY();
        newBox.x = newPosition[0];
        newBox.y = newPosition[1];
        me.setBox(newBox, animate);
    }
});
Ext.window.MessageBox.override({
    updateButtonText: function() {
        var me = this,
            btnId, btn, buttons = 0;
        for (btnId in me.buttonText) {
            if (me.buttonText.hasOwnProperty(btnId)) {
                btn = me.msgButtons[btnId];
                if (btn) {
                    if (me.cfg && me.cfg.buttons && Ext.isObject(me.cfg.buttons)) {
                        buttons = buttons | Math.pow(2, Ext.Array.indexOf(me.buttonIds, btnId));
                    }
                    if (btn.text != me.buttonText[btnId]) {
                        btn.setText(me.buttonText[btnId]);
                    }
                }
            }
        }
        return buttons;
    }
});

Ext.tab.Tab.override({
    closable: false
});

Ext.tab.Bar.override({
    initComponent: Ext.Function.createSequence(Ext.tab.Bar.prototype.initComponent, function() {
        if (this.tabPanel && this.tabPanel.tabAlign == "right") {
            this.layout.pack = "end";
        }
    }),
    closeTab: function(tab) {
        var me = this,
            card = tab.card,
            tabPanel = this.tabPanel,
            toActivate;
        toActivate = me.findNextActivatable(tab);
        Ext.suspendLayouts();
        if (tabPanel && card) {
            if (!tabPanel.closeTab(card)) {
                Ext.resumeLayouts(true);
                return false;
            }
        }
        me.remove(tab);
        delete tab.ownerCt;
        if (toActivate) {
            if (tabPanel) {
                tabPanel.setActiveTab(toActivate.card);
            } else {
                me.setActiveTab(toActivate);
            }
            toActivate.focus();
        }
        Ext.resumeLayouts(true);
    }
});

Ext.tab.Panel.prototype.initComponent = Ext.Function.createInterceptor(Ext.tab.Panel.prototype.initComponent, function() {
    if (this.tabBarItems) {
        this.tabBar = Ext.apply({}, this.tabBar, {
            items: this.tabBarItems
        });
    }
});
Ext.tab.Panel.prototype.initComponent = Ext.Function.createSequence(Ext.tab.Panel.prototype.initComponent, function() {
    this.addEvents("beforetabclose", "beforetabhide", "tabclose");
    this.on("beforetabchange", function(el, newTab) {
        newTab = newTab || {};
        var field = this.getActiveTabField();
        if (field) {
            field.setValue(this.getTabId(newTab) + ':' + el.items.indexOf(newTab));
        }
    }, this);
    this.on("render", function() {
        var field = this.getActiveTabField();
        if (field && this.hasId()) {
            field.render(this.el.parent() || this.el);
        }
    }, this);
});
Ext.tab.Panel.override({
    getTabId: function(tab) {
        return tab.id;
    },
    getActiveTabField: function() {
        if (!this.activeTabField && this.initialConfig && Ext.isDefined(this.initialConfig.id)) {
            this.activeTabField = new Ext.form.Hidden({
                name: this.id,
                value: this.id + ":" + (this.activeTab || 0)
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.activeTabField);
        }
        return this.activeTabField;
    },
    closeTab: function(item, closeAction) {
        item = this.getComponent(item);
        if (Ext.isEmpty(item)) {
            return false;
        }
        var eventName = closeAction || item.closeAction || "close",
            destroy = eventName == "close" || eventName == "destroy";
        if (eventName == "destroy") {
            eventName = "close";
        }
        if (eventName != "close") {
            if (this.fireEvent("beforetabclose", this, item) === false) {
                return false;
            }
            if (item.fireEvent("beforeclose", item) === false) {
                return false;
            }
        }
        if (this.fireEvent("beforetab" + eventName, this, item) === false) {
            return false;
        }
        if (item.fireEvent("before" + eventName, item) === false) {
            return false;
        }
        if (destroy) {
            item.fireEvent("close", item);
        }
        this.fireEvent("tabclose", this, item);
        this.remove(item, destroy);
        if (!destroy) {
            item.fireEvent("close", item);
        }
        return item;
    },
    addTab: function(tab, index, activate) {
        if (tab.id && this.getComponent(tab.id)) {
            return;
        }
        var config = {};
        if (!Ext.isEmpty(index)) {
            if (typeof index == "object") {
                config = index;
            } else if (typeof index == "number") {
                config.index = index;
            } else {
                config.activate = index;
            }
        }
        if (!Ext.isEmpty(activate)) {
            config.activate = activate;
        }
        if (this.items.getCount() === 0) {
            this.activeTab = null;
        }
        if (tab.hidden && Ext.isFunction(tab.show)) {
            tab.show();
        }
        if (!Ext.isEmpty(config.index) && config.index >= 0) {
            tab = this.insert(config.index, tab);
        } else {
            tab = this.add(tab);
        }
        if (config.activate !== false) {
            this.setActiveTab(tab);
        }
    },
    setLastTabAsActive: function() {
        this.setActiveTab(this.items.getCount() - 1);
    },
    setPreviousTabAsActive: function() {
        this.setActiveTab(Math.max(0, this.items.indexOf(this.getActiveTab()) - 1));
    },
    setNextTabAsActive: function() {
        this.setActiveTab(Math.min(this.items.getCount() - 1, this.items.indexOf(this.getActiveTab()) + 1));
    }
});

Ext.override(Ext.picker.Color, {
    getColorField: function() {
        if (!this.colorField) {
            this.colorField = new Ext.form.Hidden({
                name: this.id
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.colorField);
        }
        return this.colorField;
    },
    afterRender: function() {
        this.callParent(arguments);
        this.on("select", function(cp, color) {
            this.getColorField().setValue(color);
        });
        if (this.hasId()) {
            this.getColorField().render(this.el.parent() || this.el);
        }
    }
});

Ext.picker.Date.prototype.initComponent = Ext.Function.createSequence(Ext.picker.Date.prototype.initComponent, function() {
    var fn = function() {
        this.getInputField().setValue(Ext.Date.dateFormat(this.getValue(), "Y-m-d\\Th:i:s"));
    };
    this.on("render", fn, this);
    this.on("select", fn, this);
});
Ext.picker.Date.prototype.onRender = Ext.Function.createSequence(Ext.picker.Date.prototype.onRender, function(el) {
    if (this.hasId()) {
        this.getInputField().render(this.el.parent() || this.el);
    }
});
Ext.picker.Date.override({
    getInputField: function() {
        if (!this.inputField) {
            this.inputField = new Ext.form.Hidden({
                name: this.id
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.inputField);
        }
        return this.inputField;
    },
    createMonthPicker: function() {
        var me = this,
            picker = me.monthPicker,
            pickerConfig;
        if (!picker) {
            pickerConfig = {
                renderTo: me.el,
                floating: true,
                shadow: false,
                small: me.showToday === false,
                listeners: {
                    scope: me,
                    cancelclick: me.onCancelClick,
                    okclick: me.onOkClick,
                    yeardblclick: me.onOkClick,
                    monthdblclick: me.onOkClick
                }
            };
            if (me.monthPickerOptions) {
                Ext.apply(pickerConfig, me.monthPickerOptions);
            }
            me.monthPicker = picker = Ext.create('Ext.picker.Month', pickerConfig);
            me.on('beforehide', me.hideMonthPicker, me);
        }
        return picker;
    }
});

Ext.picker.Month.prototype.initComponent = Ext.Function.createSequence(Ext.picker.Month.prototype.initComponent, function() {
    var fn = function() {
        this.getInputField().setValue(Ext.encode(this.getValue()));
    };
    this.on("render", fn, this);
    this.on("select", fn, this);
});
Ext.picker.Month.prototype.onRender = Ext.Function.createSequence(Ext.picker.Month.prototype.onRender, function(el) {
    if (this.hasId()) {
        this.getInputField().render(this.el.parent() || this.el);
    }
});
Ext.picker.Month.override({
    getInputField: function() {
        if (!this.inputField) {
            this.inputField = new Ext.form.Hidden({
                name: this.id
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.inputField);
        }
        return this.inputField;
    }
});

Ext.picker.Time.prototype.initComponent = Ext.Function.createSequence(Ext.picker.Time.prototype.initComponent, function() {
    var fn = function(list, recordArray) {
        var record = recordArray ? recordArray[0] : this.getSelectionModel().getSelection()[0],
            val = record ? record.get('disp') : "";
        this.getInputField().setValue(val);
    };
    this.mon(this.getSelectionModel(), {
        selectionchange: fn,
        scope: this
    });
    this.on("render", fn, this);
});
Ext.picker.Time.prototype.onRender = Ext.Function.createSequence(Ext.picker.Time.prototype.onRender, function(el) {
    if (this.hasId()) {
        this.getInputField().render(this.el.parent() || this.el);
    }
});
Ext.picker.Time.override({
    getInputField: function() {
        if (!this.inputField) {
            this.inputField = new Ext.form.Hidden({
                name: this.id
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.inputField);
        }
        return this.inputField;
    },
    afterRender: function() {
        Ext.picker.Time.superclass.afterRender.call(this, arguments);
        if (this.value) {
            this.setValue(this.value);
        }
    },
    safeParse: function(value, format) {
        var me = this,
            parsedDate, result = null,
            initDate = '1/1/2008',
            initDateFormat = 'j/n/Y';
        if (Ext.Date.formatContainsDateInfo(format)) {
            result = Ext.Date.parse(value, format);
        } else {
            parsedDate = Ext.Date.parse(initDate + ' ' + value, initDateFormat + ' ' + format);
            if (parsedDate) {
                result = parsedDate;
            }
        }
        return result;
    },
    setValue: function(value) {
        if (!this.rendered) {
            this.valueOf = value;
            return;
        }
        var d, initDate = '1/1/2008',
            selModel, itemNode, lastSelected;
        if (Ext.isString(value)) {
            d = this.safeParse(value, this.format);
        } else if (Ext.isDate(value)) {
            d = value;
        }
        if (d) {
            value = Ext.Date.clearTime(new Date(initDate));
            value.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
            value = value.getTime();
            selModel = this.getSelectionModel();
            selModel.select(this.store.getAt(this.store.findBy(function(record) {
                var date = record.get('date');
                return date && date.getTime() == value;
            })));
            lastSelected = selModel.lastSelected;
            itemNode = this.getNode(lastSelected);
            if (itemNode) {
                this.highlightItem(itemNode);
                itemNode.scrollIntoView(this.el, false);
            }
        }
    },
    getValue: function() {
        var records = this.getSelectionModel().getSelection();
        if (records && records.length > 0) {
            return records[0].get('date');
        }
        return null;
    },
    getText: function() {
        var records = this.getSelectionModel().getSelection();
        if (records && records.length > 0) {
            return records[0].get('disp');
        }
        return "";
    }
});

Ext.slider.Multi.override({
    useHiddenField: true,
    includeHiddenStateToSubmitData: false,
    getHiddenStateName: function() {
        return this.getName();
    }
});

Ext.override(Ext.Button, {
    initComponent: function() {
        this.callParent(arguments);
        if (this.flat) {
            this.ui = this.ui + '-toolbar';
            this.focusCls = "";
        }
    },
    onRender: function(el) {
        this.callParent(arguments);
        this.onButtonRender(el);
    },
    getPressedField: function() {
        if (!this.pressedField && (this.hasId() || this.pressedHiddenName)) {
            this.pressedField = new Ext.form.Hidden({
                name: this.pressedHiddenName || (this.id + "_Pressed")
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.pressedField);
        }
        return this.pressedField;
    },
    menuArrow: true,
    toggleMenuArrow: function() {
        if (this.menuArrow === false) {
            this.showMenuArrow();
            this.menuArrow = true;
        } else {
            this.hideMenuArrow();
            this.menuArrow = false;
        }
    },
    showMenuArrow: function() {
        var el = this.btnWrap;
        if (!Ext.isEmpty(el)) {
            el.addCls(this.getSplitCls());
        }
    },
    hideMenuArrow: function() {
        var el = this.btnWrap;
        if (!Ext.isEmpty(el)) {
            el.removeCls(this.getSplitCls());
        }
    },
    onButtonRender: function(el) {
        if (this.enableToggle || !Ext.isEmpty(this.toggleGroup)) {
            var field = this.getPressedField();
            if (field) {
                field.render(this.el.parent() || this.el);
            }
            this.on("toggle", function(el, pressed) {
                var field = this.getPressedField();
                if (field) {
                    field.setValue(pressed);
                }
            }, this);
        }
        if (this.menuArrow === false) {
            this.hideMenuArrow();
        }
        if (this.standOut) {
            this.addClsWithUI(this.overCls);
        }
    },
    addOverCls: function() {
        if (!this.disabled && !this.standOut) {
            this.addClsWithUI(this.overCls);
        }
    },
    removeOverCls: function() {
        if (!this.standOut) {
            this.removeClsWithUI(this.overCls);
        }
    },
    setIconCls: function(cls) {
        this.callParent([cls && cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls]);
    },
    setIcon: function(icon) {
        if (this.iconCls && icon) {
            this.setIconCls("");
        }
        this.callParent([icon && icon.indexOf('#') === 0 ? X.net.RM.getIconUrl(icon.substring(1)) : icon]);
    },
    onEnable: function() {
        this.callParent(arguments);
        if (this.standOut) {
            this.addClsWithUI(this.overCls);
        }
    },
    setLoading: function(config) {
        if (Ext.isBoolean(this.loadingState)) {
            delete this.loadingState;
        }
        this.loadingState = this.loadingState || {};
        var cfg = {};
        this.clearLoadingState = {};
        this.suspendLayouts();
        if (config && Ext.isString(config)) {
            this.loadingState.text = config;
        }
        if (Ext.isObject(config)) {
            Ext.apply(this.loadingState, config);
        }
        config = this.loadingState;
        if (Ext.isDefined(config.glyph)) {
            cfg.glyph = this.glyph || null;
            this.setGlyph(config.glyph);
        }
        if (Ext.isDefined(config.iconCls) || (config.iconCls !== null && !Ext.isDefined(config.icon))) {
            cfg.iconCls = this.iconCls || "";
            this.setIconCls(config.iconCls || "x-loading-indicator");
        }
        if (Ext.isDefined(config.icon)) {
            cfg.icon = this.icon || "";
            this.setIcon(config.icon);
        }
        if (config.text !== null) {
            cfg.text = this.text || "";
            this.setText(Ext.isDefined(config.text) ? config.text : "Loading...");
        }
        if (Ext.isDefined(config.tooltip)) {
            cfg.tooltip = this.tooltip || "";
            this.setTooltip(config.tooltip);
        }
        if (Ext.isDefined(config.cls)) {
            cfg.cls = config.cls;
            this.addCls(config.cls);
        }
        if (config.disabled) {
            cfg.disabled = true;
            this.disable();
        }
        if (config.disabled === false) {
            cfg.disabled = false;
            this.enable();
        } else {
            cfg.disabled = true;
            this.disable();
        }
        if (config.hidden) {
            cfg.hidden = true;
            this.hide();
        }
        if (config.width || config.height) {
            cfg.size = this.getSize();
            this.setSize(config.width || cfg.size.width, config.height || cfg.height);
        }
        this.clearLoadingState = cfg;
        this.resumeLayouts(true);
    },
    clearLoading: function() {
        if (this.clearLoadingState) {
            this.suspendLayouts();
            var config = this.clearLoadingState;
            if (Ext.isDefined(config.glyph)) {
                this.setGlyph(config.glyph);
            }
            if (Ext.isDefined(config.iconCls)) {
                this.setIconCls(config.iconCls);
            }
            if (Ext.isDefined(config.icon)) {
                this.setIcon(config.icon);
            }
            if (Ext.isDefined(config.text)) {
                this.setText(config.text);
            }
            if (Ext.isDefined(config.tooltip)) {
                this.setTooltip(config.tooltip);
            }
            if (Ext.isDefined(config.cls)) {
                this.removeCls(config.cls);
            }
            if (config.disabled) {
                this.enable();
            }
            if (config.hidden) {
                this.show();
            }
            if (config.size) {
                this.setSize(config.size);
            }
            delete this.clearLoadingState;
            this.resumeLayouts(true);
        }
    },
    beforeDirectEvent: function(o) {
        if (o.action == "Click" && this.loadingState) {
            this.setLoading();
        }
    },
    afterDirectEvent: function(o) {
        if (o.action == "Click" && this.clearLoadingState) {
            this.clearLoading();
        }
    }
});


Ext.button.Cycle.prototype.setActiveItem = Ext.Function.createSequence(Ext.button.Cycle.prototype.setActiveItem, function(item, suppressEvent) {
    if (!this.forceIcon && item.icon) {
        this.setIcon(item.icon);
    }
});
Ext.button.Cycle.override({
    toggleSelected: function() {
        var me = this,
            m = me.menu,
            checkItem;
        checkItem = me.activeItem.next(':not([disabled])[setChecked]') || m.items.getAt(0);
        checkItem.setChecked(true);
    }
});

Ext.define("Ext.net.ImageButton", {
    extend: "Ext.button.Button",
    alias: "widget.netimagebutton",
    cls: "",
    iconAlign: "left",
    initRenderTpl: Ext.emptyFn,
    componentLayout: null,
    autoEl: 'img',
    frame: false,
    initComponent: function() {
        this.scale = null;
        this.callParent();
        this.autoEl = {
            tag: 'img',
            role: 'button',
            hidefocus: 'on',
            unselectable: 'on'
        };
        var i;
        if (this.imageUrl) {
            i = new Image().src = this.imageUrl;
        }
        if (this.overImageUrl) {
            i = new Image().src = this.overImageUrl;
        }
        if (this.disabledImageUrl) {
            i = new Image().src = this.disabledImageUrl;
        }
        if (this.pressedImageUrl) {
            i = new Image().src = this.pressedImageUrl;
        }
    },
    getElConfig: function() {
        return Ext.apply(this.callParent(), {
            tag: "img",
            id: this.getId(),
            src: this.imageUrl,
            style: this.getStyle()
        });
    },
    getStyle: function() {
        var style = "border:none;cursor:pointer;";
        if (this.style) {
            style += this.style;
        }
        if (this.height) {
            style += "height:" + this.height + "px;";
        }
        if (this.width) {
            style += "width:" + this.width + "px;";
        }
        return style;
    },
    applyChildEls: function() {
        this.callParent(arguments);
        this.btnEl = this.el;
    },
    onRender: function(ct, position) {
        this.imgEl = this.el;
        if (!Ext.isEmpty(this.imgEl.getAttributeNS("", "width"), false) || !Ext.isEmpty(this.imgEl.getAttributeNS("", "height"), false)) {
            this.imgEl.dom.removeAttribute("width");
            this.imgEl.dom.removeAttribute("height");
        }
        if (this.altText) {
            this.imgEl.dom.setAttribute("alt", this.altText);
        }
        if (this.align && this.align !== "notset") {
            this.imgEl.dom.setAttribute("align", this.align);
        }
        if (this.pressed && this.pressedImageUrl) {
            this.imgEl.dom.src = this.pressedImageUrl;
        }
        if (this.disabled) {
            this.setDisabled(true);
        }
        if (this.tabIndex !== undefined) {
            this.imgEl.dom.tabIndex = this.tabIndex;
        }
        if (this.href) {
            this.on("click", function() {
                if (this.target) {
                    window.open(this.href, this.target);
                } else {
                    window.location = this.href;
                }
            }, this);
        }
        this.callParent();
    },
    onMenuShow: function(e) {
        this.ignoreNextClick = 0;
        this.fireEvent("menushow", this, this.menu);
    },
    onMenuHide: function(e) {
        this.ignoreNextClick = Ext.defer(this.restoreClick, 250, this);
        this.fireEvent("menuhide", this, this.menu);
    },
    getTriggerSize: function() {
        return 0;
    },
    toggle: function(state, suppressEvent, suppressHandler) {
        state = state === undefined ? !this.pressed : !!state;
        if (state != this.pressed) {
            if (state) {
                if (this.pressedImageUrl) {
                    this.imgEl.dom.src = this.pressedImageUrl;
                }
                this.pressed = true;
            } else {
                this.imgEl.dom.src = (this.monitoringMouseOver) ? this.overImageUrl : this.imageUrl;
                this.pressed = false;
            }
            if (!suppressEvent) {
                this.fireEvent("toggle", this, this.pressed);
            }
            if (this.toggleHandler && !suppressHandler) {
                this.toggleHandler.call(this.scope || this, this, state);
            }
        }
        return this;
    },
    setText: Ext.emptyFn,
    setDisabled: function(disabled) {
        this.disabled = disabled;
        if (this.imgEl && this.imgEl.dom) {
            this.imgEl.dom.disabled = disabled;
        }
        if (disabled) {
            if (this.disabledImageUrl) {
                this.imgEl.dom.src = this.disabledImageUrl;
            } else {
                this.imgEl.addCls(this.disabledCls);
            }
            this.imgEl.setStyle({
                cursor: "default"
            });
        } else {
            this.imgEl.dom.src = this.imageUrl;
            this.imgEl.setStyle({
                cursor: "pointer"
            });
            this.imgEl.removeCls(this.disabledCls);
        }
    },
    onMouseOver: function(e) {
        if (!this.disabled) {
            var internal = e.within(this.el.dom, true);
            if (!internal) {
                if (this.overImageUrl && !this.pressed) {
                    this.imgEl.dom.src = this.overImageUrl;
                }
                if (!this.monitoringMouseOver) {
                    this.doc.on("mouseover", this.monitorMouseOver, this);
                    this.monitoringMouseOver = true;
                }
            }
        }
        this.fireEvent("mouseover", this, e);
    },
    monitorMouseOver: function(e) {
        if (e.target != this.el.dom && !e.within(this.el)) {
            if (this.monitoringMouseOver) {
                this.doc.un('mouseover', this.monitorMouseOver, this);
                this.monitoringMouseOver = false;
            }
            this.onMouseOut(e);
        }
    },
    onMouseEnter: function(e) {
        if (this.overImageUrl && !this.pressed && !this.disabled) {
            this.imgEl.dom.src = this.overImageUrl;
        }
        this.fireEvent("mouseover", this, e);
    },
    onMouseOut: function(e) {
        if (!this.disabled && !this.pressed) {
            this.imgEl.dom.src = this.imageUrl;
        }
        this.fireEvent("mouseout", this, e);
    },
    onMouseDown: function(e) {
        var me = this;
        if (Ext.isIE) {
            me.getFocusEl().focus();
        }
        if (!me.disabled && e.button === 0) {
            if (me.pressedImageUrl) {
                me.imgEl.dom.src = me.pressedImageUrl;
            }
            Ext.button.Manager.onButtonMousedown(me, e);
        }
    },
    onMouseUp: function(e) {
        if (e.button === 0 && !(this.enableToggle && this.allowDepress === false)) {
            this.imgEl.dom.src = (this.overImageUrl && this.monitoringMouseOver) ? this.overImageUrl : this.imageUrl;
        }
    },
    setImageUrl: function(image) {
        this.imageUrl = image;
        if ((!this.disabled || Ext.isEmpty(this.disabledImageUrl, false)) && (!this.pressed || Ext.isEmpty(this.pressedImageUrl, false))) {
            this.imgEl.dom.src = image;
        } else {
            new Image().src = image;
        }
    },
    setDisabledImageUrl: function(image) {
        this.disabledImageUrl = image;
        if (this.disabled) {
            this.imgEl.dom.src = image;
        } else {
            new Image().src = image;
        }
    },
    setOverImageUrl: function(image) {
        this.overImageUrl = image;
        if ((!this.disabled || Ext.isEmpty(this.disabledImageUrl, false)) && (!this.pressed || Ext.isEmpty(this.pressedImageUrl, false))) {
            this.imgEl.dom.src = image;
        } else {
            new Image().src = image;
        }
    },
    setPressedImageUrl: function(image) {
        this.pressedImageUrl = image;
        if ((!this.disabled || Ext.isEmpty(this.disabledImageUrl, false)) && this.pressed) {
            this.imgEl.dom.src = image;
        } else {
            new Image().src = image;
        }
    },
    setAlign: function(align) {
        this.align = align;
        if (this.rendered) {
            this.imgEl.dom.setAttribute("align", this.align);
        }
    },
    setAltText: function(altText) {
        this.altText = altText;
        if (this.rendered) {
            this.imgEl.dom.setAttribute("altText", this.altText);
        }
    }
});

Ext.define("Ext.net.LinkButton", {
    extend: "Ext.button.Button",
    alias: "widget.netlinkbutton",
    buttonSelector: "a:first",
    cls: "",
    iconAlign: "left",
    initRenderTpl: Ext.emptyFn,
    applyRenderSelectors: Ext.emptyFn,
    componentLayout: null,
    scale: null,
    autoEl: 'span',
    frame: false,
    initComponent: function() {
        this.callParent();
        this.autoEl = {
            tag: 'span',
            role: 'button',
            hidefocus: 'on',
            unselectable: 'on'
        };
        this.setIconCls = this.setIconClass;
    },
    onMenuShow: function(e) {
        this.ignoreNextClick = 0;
        this.fireEvent("menushow", this, this.menu);
    },
    onMenuHide: function(e) {
        this.ignoreNextClick = Ext.defer(this.restoreClick, 250, this);
        this.fireEvent("menuhide", this, this.menu);
    },
    toggle: function(state) {
        state = state === undefined ? !this.pressed : state;
        if (state != this.pressed) {
            if (state) {
                this.setDisabled(true);
                this.disabled = false;
                this.pressed = true;
                if (this.allowDepress !== false) {
                    this.textEl.style.cursor = "pointer";
                    this.el.dom.style.cursor = "pointer";
                }
                this.fireEvent("toggle", this, true);
            } else {
                this.setDisabled(false);
                this.pressed = false;
                this.fireEvent("toggle", this, false);
            }
            if (this.toggleHandler) {
                this.toggleHandler.call(this.scope || this, this, state);
            }
        }
    },
    valueElement: function() {
        var textEl = document.createElement("a");
        textEl.style.verticalAlign = "middle";
        if (!Ext.isEmpty(this.cls, false)) {
            textEl.className = this.cls;
        }
        textEl.setAttribute("href", "#");
        if (this.disabled || this.pressed) {
            textEl.setAttribute("disabled", "1");
            textEl.removeAttribute("href");
            if (this.pressed && this.allowDepress !== false) {
                textEl.style.cursor = "pointer";
            }
        }
        if (this.tabIndex) {
            textEl.tabIndex = this.tabIndex;
        }
        if (this.tooltip) {
            if (typeof this.tooltip == "object") {
                Ext.QuickTips.register(Ext.apply({
                    target: textEl.id
                }, this.tooltip));
            } else {
                textEl[this.tooltipType] = this.tooltip;
            }
        }
        textEl.innerHTML = this.text;
        this.textEl = textEl;
        return this.textEl;
    },
    getElConfig: function() {
        return Ext.apply(this.callParent(), {
            id: this.getId(),
            tag: "span"
        });
    },
    onRender: function(ct, position) {
        var el = this.el.dom;
        var img = document.createElement("img");
        img.src = Ext.BLANK_IMAGE_URL;
        img.className = "x-label-icon " + (this.iconCls || "");
        if (Ext.isEmpty(this.iconCls)) {
            img.style.display = "none";
        }
        if (this.iconAlign == "left") {
            el.appendChild(img);
        }
        el.appendChild(this.valueElement());
        this.btnEl = Ext.get(this.textEl);
        if (this.iconAlign == "right") {
            el.appendChild(img);
        }
        this.callParent(arguments);
        this.mun(this.el, this.clickEvent, this.onClick, this);
        this.mon(Ext.get(this.textEl), this.clickEvent, this.onClick, this);
        this.el.dom.style.cursor = "default";
        if (this.pressed && this.allowDepress !== false) {
            this.setDisabled(true);
            this.disabled = false;
            this.textEl.style.cursor = "pointer";
        }
    },
    getTriggerSize: function() {
        return 0;
    },
    setText: function(t, encode) {
        this.text = t;
        if (this.rendered) {
            this.textEl.innerHTML = encode !== false ? Ext.util.Format.htmlEncode(t) : t;
        }
        return this;
    },
    setIconClass: function(cls) {
        var oldCls = this.iconCls;
        this.iconCls = cls;
        if (this.rendered) {
            var img = this.el.child("img.x-label-icon");
            img.replaceCls(oldCls, this.iconCls);
            img.dom.style.display = (cls === "") ? "none" : "inline";
        }
    },
    onDisable: function() {
        Ext.net.LinkButton.superclass.onDisable.apply(this);
        this.textEl.setAttribute("disabled", "1");
        this.textEl.removeAttribute("href");
    },
    onEnable: function() {
        Ext.net.LinkButton.superclass.onEnable.apply(this);
        this.textEl.removeAttribute("disabled");
        this.textEl.setAttribute("href", "#");
    }
});

Ext.dd.DragDrop.override({
    applyConfig: function() {
        var me = this;
        me.callParent();
        if (me.dragDropGroups) {
            Ext.Object.each(me.dragDropGroups, function(key, value, groups) {
                if (value) {
                    me.addToGroup(key);
                }
            });
            delete me.dragDropGroups;
            me.removeFromGroup("default");
        }
    }
});

Ext.override(Ext.dd.DragDropManager, {
    startDrag: function(x, y) {
        var me = this,
            current = me.dragCurrent,
            dragEl;
        clearTimeout(me.clickTimeout);
        if (current) {
            current.b4StartDrag(x, y);
            current.startDrag(x, y);
            dragEl = Ext.fly(current.getDragEl());
            if (dragEl && dragEl.dom.className && dragEl.dom.className.replace) {
                dragEl.addCls(me.dragCls);
            }
        }
        me.dragThreshMet = true;
    }
});

Ext.define("Ext.net.DragTracker", {
    extend: "Ext.dd.DragTracker",
    proxyCls: "x-view-selector",
    onStart: function(xy) {
        if (!this.proxy) {
            this.proxy = this.el.createChild({
                cls: this.proxyCls
            });
        } else {
            this.proxy.setDisplayed("block");
        }
    },
    onDrag: function(e) {
        var startXY = this.startXY,
            xy = this.getXY(),
            x = Math.min(startXY[0], xy[0]),
            y = Math.min(startXY[1], xy[1]),
            w = Math.abs(startXY[0] - xy[0]),
            h = Math.abs(startXY[1] - xy[1]);
        this.dragRegion.x = this.dragRegion.left = this.dragRegion[0] = x;
        this.dragRegion.y = this.dragRegion.top = this.dragRegion[1] = y;
        this.dragRegion.right = x + w;
        this.dragRegion.bottom = y + h;
        this.proxy.setRegion(this.dragRegion);
    },
    onEnd: function(e) {
        if (this.proxy) {
            this.proxy.setDisplayed(false);
        }
    }
});

Ext.define("Ext.net.ProxyDDCreator", {
    mixins: {
        observable: "Ext.util.Observable"
    },
    constructor: function(config) {
        Ext.apply(this, config);
        this.config = config || {};
        this.initialConfig = this.config;
        this.mixins.observable.constructor.call(this);
        if (!Ext.isEmpty(this.config.target, false)) {
            var targetEl = Ext.net.getEl(this.config.target);
            if (!Ext.isEmpty(targetEl)) {
                this.initDDControl(targetEl);
            } else {
                this.task = new Ext.util.DelayedTask(function() {
                    targetEl = Ext.net.getEl(this.config.target);
                    if (!Ext.isEmpty(targetEl)) {
                        this.task.cancel();
                        this.initDDControl(targetEl);
                    } else {
                        this.task.delay(500);
                    }
                }, this);
                this.task.delay(1);
            }
        }
    },
    initDDControl: function(target) {
        target = Ext.net.getEl(target);
        if (target.isComposite) {
            this.ddControl = [];
            target.each(function(targetEl) {
                this.ddControl.push(this.createControl(Ext.apply(Ext.net.clone(this.config), {
                    id: Ext.id(targetEl)
                })));
            }, this);
        } else {
            this.ddControl = this.createControl(Ext.apply(Ext.net.clone(this.config), {
                id: Ext.id(target)
            }));
        }
    },
    createControl: function(config) {
        var ddControl;
        if (config.config.groups) {
            config.config.dragDropGroups = config.config.groups;
        }
        if (config.group) {
            ddControl = new config.type(config.id, config.group, config.config);
            Ext.apply(ddControl, config.config);
        } else {
            ddControl = new config.type(config.id, config.config);
        }
        return ddControl;
    },
    lock: function() {
        Ext.each(this.ddControl, function(dd) {
            if (dd && dd.lock) {
                dd.lock();
            }
        });
    },
    unlock: function() {
        Ext.each(this.ddControl, function(dd) {
            if (dd && dd.unlock) {
                dd.unlock();
            }
        });
    },
    unreg: function() {
        Ext.each(this.ddControl, function(dd) {
            if (dd && dd.unreg) {
                dd.unreg();
            }
        });
    },
    destroy: function() {
        Ext.each(this.ddControl, function(dd) {
            if (dd && dd.unreg) {
                dd.unreg();
            }
        });
    }
});

Ext.form.field.Base.override({
    isRemoteValidation: false,
    remoteValidatingMessage: "Validating...",
    onRender: Ext.Function.createSequence(Ext.form.field.Base.prototype.onRender, function(el) {
        if (this.inputEl && this.submitValue === false) {
            this.inputEl.dom.name = "";
            this.inputEl.dom.removeAttribute('name');
        }
    }),
    onBlur: function() {
        if (this.inEditor && this.surpressBlur) {
            return;
        }
        this.callParent(arguments);
    },
    getRawValue: function() {
        var me = this,
            v = (me.inputEl ? me.inputEl.getValue() : Ext.value(me.rawValue || me.value, ''));
        me.rawValue = v;
        return v;
    },
    getErrors: function(value) {
        var me = this,
            errors = [],
            validator = me.validator,
            vtype = me.vtype,
            vtypes = Ext.form.field.VTypes,
            msg, trimmed, isStr;
        value = (value || value === 0) ? value : me.getRawValue();
        if (Ext.isFunction(validator)) {
            msg = validator.call(me, value, me.vtypeParams);
            if (msg !== true) {
                errors.push(Ext.isString(msg) ? msg : (me.validatorText || "Value is invalid"));
            }
        }
        isStr = Ext.isString(value);
        trimmed = (me.allowOnlyWhitespace || !isStr) ? value : Ext.String.trim(value);
        if (!me.validateBlank && ((isStr && trimmed.length < 1) || (value === me.emptyText && me.valueContainsPlaceholder))) {
            return errors;
        }
        if (vtype) {
            if (!vtypes[vtype](value, me, me.vtypeParams)) {
                errors.push(me.vtypeText || vtypes[vtype + 'Text']);
            }
        }
        return errors;
    },
    activateRemoteValidation: function() {
        this.originalIsValid = this.isValid;
        this.originalValidate = this.validate;
        this.isValid = this.rv_isValid;
        this.validate = this.rv_validate;
        this.rvConfig = Ext.apply({
            remoteValidated: false,
            remoteValid: false,
            validationEvent: "change",
            eventOwner: "field",
            validationBuffer: 500,
            showBusy: true,
            busyIconCls: "x-loading-indicator",
            busyTip: "Validating...",
            initValueValidation: "valid",
            errorMessage: "Invalid",
            responseFields: {
                success: "valid",
                message: "message",
                returnValue: "value"
            }
        }, this.remoteValidationOptions || {});
        var fn = function() {
            this.rvTask = new Ext.util.DelayedTask(this.remoteValidate, this);
            if (this.rvConfig.validationEvent && this.rvConfig.validationEvent.indexOf(",") > 0) {
                this.rvConfig.validationEvent = this.rvConfig.validationEvent.split(",");
            }
            if (Ext.isArray(this.rvConfig.validationEvent)) {
                Ext.each(this.rvConfig.validationEvent, function(event) {
                    (this.rvConfig.eventOwner == "input" ? this.inputEl : this).on(event, this.performRemoteValidation, this);
                }, this);
            } else {
                (this.rvConfig.eventOwner == "input" ? this.inputEl : this).on(this.rvConfig.validationEvent, this.performRemoteValidation, this);
            }
        };
        if (this.rendered) {
            fn.call(this);
        } else {
            this.on("render", fn);
            this.on("afterrender", function() {
                switch (this.rvConfig.initValueValidation) {
                    case "valid":
                        this.markAsValid();
                        break;
                    case "invalid":
                        break;
                    case "validate":
                        this.remoteValidate();
                        break;
                }
            });
        }
    },
    append: function(v) {
        this.setValue([this.getValue(), v].join(''));
    },
    deactivateRemoteValidation: function() {
        this.isValid = this.originalIsValid;
        this.validate = this.originalValidate;
        if (this.rvTask) {
            this.rvTask.cancel();
        }
        if (Ext.isArray(this.rvConfig.validationEvent)) {
            Ext.each(this.rvConfig.validationEvent, function(event) {
                (this.rvConfig.eventOwner == "input" ? this.inputEl : this).un(event, this.performRemoteValidation, this);
            }, this);
        } else {
            (this.rvConfig.eventOwner == "input" ? this.inputEl : this).un(this.rvConfig.validationEvent, this.performRemoteValidation, this);
        }
        delete this.originalIsValid;
        delete this.originalValidate;
    },
    markAsValid: function(abortRequest) {
        if (!this.isRemoteValidation) {
            return;
        }
        this.rvConfig.validating = false;
        this.rvConfig.remoteValidated = true;
        this.rvConfig.remoteValid = true;
        if (this.validationId && abortRequest !== false) {
            Ext.net.DirectEvent.abort(this.validationId);
        }
    },
    rv_isValid: function() {
        if (this.disabled) {
            return true;
        }
        if (this.rvConfig.validating) {
            preventMark = true;
        }
        return this.originalIsValid.call(this) && !this.rvConfig.validating && this.rvConfig.remoteValidated && this.rvConfig.remoteValid;
    },
    localValidate: function() {
        var me = this,
            isValid = me.originalIsValid.call(me);
        if (isValid !== me.wasValid) {
            me.wasValid = isValid;
            me.fireEvent('validitychange', me, isValid);
        }
        return isValid;
    },
    rv_validate: function() {
        var clientValid = this.localValidate(),
            orgPrevent;
        if (!this.disabled && !clientValid) {
            return false;
        }
        if (this.rvConfig.validating) {
            orgPrevent = this.preventMark;
            this.preventMark = true;
            this.markInvalid(this.remoteValidatingMessage);
            this.preventMark = orgPrevent;
            this.wasValid = false;
            this.fireEvent('validitychange', this, false);
            return false;
        }
        if (this.disabled || (clientValid && (!this.rvConfig.remoteValidated || this.rvConfig.remoteValid))) {
            if (!this.rvConfig.ignoreLastValue && this.rvConfig.lastValue === this.getValue() && this.rvConfig.remoteValid === false) {
                this.markInvalid(this.rv_response.message || this.rvConfig.errorMessage);
                this.wasValid = false;
                this.fireEvent('validitychange', this, false);
            } else {
                this.clearInvalid();
                this.wasValid = true;
                this.fireEvent('validitychange', this, true);
            }
            return this.rvConfig.remoteValid;
        }
        if (this.rvConfig.remoteValidated && !this.rvConfig.remoteValid) {
            orgPrevent = this.preventMark;
            this.preventMark = this.rvConfig.validating;
            this.markInvalid(this.rv_response.message || this.rvConfig.errorMessage);
            this.preventMark = orgPrevent;
            this.wasValid = this.rvConfig.validating;
            this.fireEvent('validitychange', this, this.rvConfig.validating);
            return false;
        }
        return false;
    },
    performRemoteValidation: function(e) {
        var orgPrevent = this.preventMark;
        this.preventMark = true;
        if ((this.rvConfig.lastValue === this.getValue() && !this.rvConfig.ignoreLastValue) || !this.originalIsValid(true)) {
            this.preventMark = orgPrevent;
            this.rvTask.cancel();
            return;
        }
        this.preventMark = orgPrevent;
        if (!e || !e.isNavKeyPress || (e && e.isNavKeyPress && !e.isNavKeyPress())) {
            if (e && e.normalizeKey) {
                var k = e.normalizeKey(e.keyCode);
                if (k >= 16 && k <= 20) {
                    return;
                }
            }
            this.rvTask.delay(this.rvConfig.validationBuffer);
        }
    },
    remoteValidate: function() {
        this.rvConfig.remoteValid = false;
        this.rvConfig.remoteValidated = false;
        var dc = Ext.apply({}, this.remoteValidationOptions),
            options = {
                params: {}
            };
        if (this.fireEvent("beforeremotevalidation", this, options) !== false) {
            dc.userSuccess = this.remoteValidationSuccess;
            dc.userFailure = this.remoteValidationFailure;
            dc.extraParams = Ext.apply(dc.extraParams || {}, options.params);
            dc.control = this;
            dc.eventType = "postback";
            dc.action = "remotevalidation";
            var o = {
                    id: this.id,
                    name: this.name,
                    value: this.getValue()
                },
                directFn = dc.directFn;
            dc.serviceParams = Ext.encode(o);
            if (dc.url && !directFn) {
                dc.cleanRequest = true;
                if (dc.json && Ext.isEmpty(dc.method, false)) {
                    dc.method = "POST";
                }
                dc.extraParams = Ext.apply(dc.extraParams, o);
                dc.type = "load";
            }
            if (this.rvConfig.showBusy) {
                this.saveIndicator("remotevalidation", true);
                this.setIndicatorIconCls(this.rvConfig.busyIconCls, true);
                this.showIndicator();
                if (this.rvConfig.busyTip) {
                    this.setIndicatorTip(this.rvConfig.busyTip);
                }
            }
            this.rvConfig.remoteValidated = false;
            this.rvConfig.validating = true;
            this.rvConfig.lastValue = o.value;
            this.wasValid = false;
            this.fireEvent('validitychange', false);
            if (this.validationId) {
                this.validationId.abortedByEvent = true;
                try {
                    Ext.net.DirectEvent.abort(this.validationId);
                } catch (e) {}
            }
            if (directFn) {
                if (Ext.isString(directFn)) {
                    directFn = Ext.decode(directFn);
                }
                var extraParams = dc.extraParams;
                delete dc.extraParams;
                delete dc.serviceParams;
                delete dc.control;
                delete dc.eventType;
                delete dc.action;
                dc.successSeq = dc.userSuccess;
                dc.failureSeq = dc.userFailure;
                delete dc.userSuccess;
                delete dc.userFailure;
                dc.showFailureWarning = false;
                if (directFn.length === 2) {
                    this.validationId = directFn(o.value, dc);
                } else if (directFn.length === 3) {
                    this.validationId = directFn(o.value, o.name, dc);
                } else if (directFn.length === 4) {
                    this.validationId = directFn(o.value, o.name, o.id);
                } else {
                    this.validationId = directFn(o.value, o.name, o.id, extraParams || null, dc);
                }
            } else {
                this.validationId = Ext.net.DirectEvent.request(dc);
            }
        }
    },
    remoteValidationSuccess: function(response, result, context, type, action, extraParams, o) {
        var isException = false,
            responseObj;
        this.rvConfig.validating = false;
        this.validationId = null;
        if (this.rvConfig.showBusy) {
            this.restoreIndicator("remotevalidation");
        }
        try {
            if (this.remoteValidationOptions && this.remoteValidationOptions.directFn) {
                responseObj = Ext.isEmpty(result.result, true) ? (result.d || result) : result.result;
                if (Ext.isString(responseObj)) {
                    result = {
                        success: false,
                        message: responseObj
                    };
                } else if (Ext.isBoolean(responseObj)) {
                    result = {
                        success: responseObj
                    };
                } else {
                    result = responseObj;
                }
            } else {
                responseObj = result.serviceResponse || result.d || result;
                result = {
                    success: responseObj[this.rvConfig.responseFields.success],
                    message: responseObj[this.rvConfig.responseFields.message],
                    value: responseObj[this.rvConfig.responseFields.returnValue]
                };
            }
        } catch (ex) {
            result = {
                success: false,
                message: ex.message
            };
            isException = true;
            this.rvConfig.remoteValidated = true;
            this.rvConfig.remoteValid = false;
            this.fireEvent("remotevalidationinvalid", this, response, responseObj, ex, o);
            if (o.cancelWarningFailure !== true && (this.remoteValidationOptions || {}).showWarningFailure !== false && !this.hasListener("remotevalidationinvalid")) {
                Ext.net.DirectEvent.showFailure(response, response.responseText);
            }
            return;
        }
        if (!isException && result.success !== true) {
            this.fireEvent("remotevalidationinvalid", this, response, responseObj, result, o);
        }
        if (result.success === true) {
            this.fireEvent("remotevalidationvalid", this, response, responseObj, result, o);
        }
        if (result.value !== null && Ext.isDefined(result.value)) {
            this.setValue(result.value);
        }
        this.rvConfig.remoteValidated = true;
        this.rvConfig.remoteValid = result.success;
        this.rv_response = result;
        this.validate();
    },
    remoteValidationFailure: function(response, result, context, type, action, extraParams, o) {
        if (response.request.abortedByEvent) {
            return;
        }
        this.validationId = null;
        if (this.rvConfig.showBusy) {
            this.restoreIndicator("remotevalidation");
        }
        this.fireEvent("remotevalidationfailure", this, response, {
            message: response.statusText
        }, o);
        this.rvConfig.validating = false;
        this.rvConfig.remoteValidated = true;
        this.rvConfig.remoteValid = false;
        this.rv_response = {
            success: false,
            message: response.responseText
        };
        this.wasValid = false;
        this.fireEvent('validitychange', false);
        if (o.cancelWarningFailure !== true && (this.remoteValidationOptions || {}).showWarningFailure !== false && !this.hasListener("remotevalidationfailure")) {
            Ext.net.DirectEvent.showFailure(response, response.responseText);
        }
    }
});
Ext.form.field.Base.prototype.initComponent = Ext.Function.createSequence(Ext.form.field.Base.prototype.initComponent, function() {
    this.addEvents({
        "remotevalidationfailure": true,
        "remotevalidationinvalid": true,
        "remotevalidationvalid": true,
        "beforeremotevalidation": true,
        "indicatoriconclick": true
    });
    this.remoteValidationSuccess = Ext.Function.bind(this.remoteValidationSuccess, this);
    this.remoteValidationFailure = Ext.Function.bind(this.remoteValidationFailure, this);
    if (this.isRemoteValidation) {
        this.activateRemoteValidation();
    }
});

Ext.net.FieldNote = {
    autoFitIndicator: true,
    useHiddenField: false,
    includeHiddenStateToSubmitData: true,
    submitEmptyHiddenState: true,
    overrideSubmiDataByHiddenState: false,
    isIndicatorActive: false,
    getHiddenStateName: function() {
        return "_" + this.getName() + "_state";
    },
    getSubmitData: function() {
        var me = this,
            data = null,
            val;
        if (!me.disabled && me.submitValue && !me.isFileUpload()) {
            val = me.getSubmitValue();
            if (val !== null) {
                data = {};
                data[me.getName()] = val;
                val = me.getHiddenState(val);
                if (this.useHiddenField && this.includeHiddenStateToSubmitData && val !== null) {
                    data[this.getHiddenStateName()] = val;
                }
            }
        }
        return data;
    },
    checkHiddenStateName: function() {
        if (this.hiddenField && this.submitEmptyHiddenState === false) {
            if (Ext.isEmpty(this.hiddenField.dom.value)) {
                this.hiddenField.dom.name = "";
                this.hiddenField.dom.removeAttribute("name");
            } else {
                this.hiddenField.set({
                    name: this.getHiddenStateName()
                });
            }
        }
    },
    getHiddenState: function(value) {
        return value;
    },
    hideNote: function() {
        if (!Ext.isEmpty(this.note, false) && this.noteEl) {
            this.noteEl.addCls("x-hide-" + this.hideMode);
        }
    },
    showNote: function() {
        if (!Ext.isEmpty(this.note, false) && this.noteEl) {
            this.noteEl.removeCls("x-hide-" + this.hideMode);
        }
    },
    setNote: function(t, encode) {
        this.note = t;
        if (this.rendered) {
            this.noteEl.dom.innerHTML = encode !== false ? Ext.util.Format.htmlEncode(t) : t;
        }
    },
    setNoteCls: function(cls) {
        if (this.rendered) {
            this.noteEl.removeCls(this.noteCls);
            this.noteEl.addCls(cls);
        }
        this.noteCls = cls;
    },
    clear: function() {
        this.setValue("");
    },
    isIndicatorEmpty: function() {
        return Ext.isEmpty(this.indicatorText) && Ext.isEmpty(this.indicatorCls) && Ext.isEmpty(this.indicatorIconCls);
    },
    clearIndicator: function(preventLayout, holder) {
        holder = holder || {};
        this.setIndicator(holder.indicatorText || "", false, true);
        this.setIndicatorCls(holder.indicatorCls || "", true);
        this.setIndicatorIconCls(holder.indicatorIconCls || "", true);
        this.setIndicatorTip(holder.indicatorTip || "", true);
        if (preventLayout !== true) {
            this.isIndicatorActive = true;
            this.needIndicatorRelayout = false;
            this.doComponentLayout();
        } else {
            this.needIndicatorRelayout = true;
        }
        this.isIndicatorActive = false;
    },
    saveIndicator: function(name, ignoreExists) {
        this._indicators = this._indicators || {};
        if (ignoreExists && this._indicators[name || "default"]) {
            return;
        }
        var holder = this._indicators[name || "default"] || {};
        holder.indicatorText = this.indicatorText;
        holder.indicatorCls = this.indicatorCls;
        holder.indicatorIconCls = this.indicatorIconCls;
        holder.indicatorTip = this.indicatorTip;
        this._indicators[name || "default"] = holder;
    },
    restoreIndicator: function(name, remove) {
        if (!this._indicators) {
            return;
        }
        var holder = this._indicators[name || "default"];
        this.clearIndicator(false, holder);
        if (remove !== false && holder) {
            delete this._indicators[name || "default"];
        }
        return holder;
    },
    setIndicator: function(t, encode, preventLayout) {
        this.indicatorText = t;
        if (this.indicatorEl) {
            this.isIndicatorActive = true;
            this.indicatorEl.dom.innerHTML = encode !== false ? Ext.util.Format.htmlEncode(t) : t;
            if (preventLayout !== true) {
                if (this.autoFitIndicator) {
                    this.indicatorEl.setStyle("width", "");
                }
                this.needIndicatorRelayout = false;
                this.doComponentLayout();
            } else {
                this.needIndicatorRelayout = true;
            }
        }
    },
    setIndicatorCls: function(cls, preventLayout) {
        if (this.indicatorEl) {
            this.indicatorEl.removeCls(this.indicatorCls);
            this.indicatorEl.addCls(cls);
            if (preventLayout !== true) {
                this.needIndicatorRelayout = false;
                this.doComponentLayout();
            } else {
                this.needIndicatorRelayout = true;
            }
        }
        this.indicatorCls = cls;
    },
    setIndicatorIconCls: function(cls, preventLayout) {
        if (this.indicatorEl) {
            this.isIndicatorActive = true;
            this.indicatorEl.removeCls(this.indicatorIconCls);
            cls = cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls;
            this.indicatorEl.addCls(cls);
            if (preventLayout !== true) {
                this.needIndicatorRelayout = false;
                this.doComponentLayout();
            } else {
                this.needIndicatorRelayout = true;
            }
        }
        this.indicatorIconCls = cls;
    },
    initIndicatorTip: function() {
        if (this.indicatorTip) {
            Ext.QuickTips.register(Ext.apply({
                target: this.indicatorEl
            }, this.indicatorTip));
            this.indicatorEl.set({
                "data-qtip": this.indicatorTip
            });
        }
    },
    setIndicatorTip: function(tip) {
        this.indicatorTip = Ext.apply(this.indicatorTip || {}, {
            text: tip
        });
        if (!this.indicatorEl) {
            this.initIndicator();
        } else {
            if (Ext.QuickTips.getQuickTip().targets[this.indicatorEl.id]) {
                Ext.QuickTips.getQuickTip().targets[this.indicatorEl.id].text = tip;
            } else {
                this.initIndicatorTip();
            }
        }
        if (this.indicatorEl) {
            this.isIndicatorActive = true;
            if (Ext.QuickTips.getQuickTip().targets[this.indicatorEl.id]) {
                Ext.QuickTips.getQuickTip().targets[this.indicatorEl.id].text = tip;
            } else {
                this.initIndicatorTip();
            }
        }
    },
    showIndicator: function(preventLayout) {
        if (Ext.isObject(preventLayout)) {
            var cfg = preventLayout;
            preventLayout = cfg.preventLayout;
            this.setIndicatorTip(cfg.tip || "", true);
            this.setIndicatorIconCls(cfg.iconCls || "", true);
            this.setIndicatorCls(cfg.cls || "", true);
            this.setIndicator(cfg.text || "", cfg.encode || false, true);
        }
        if (this.indicatorEl && (this.indicatorHidden !== false || this.needIndicatorRelayout)) {
            var td = this.indicatorEl.parent("td");
            if (this.preserveIndicatorIcon) {
                this.indicatorEl.fixDisplay();
                td.dom.style.visibility = '';
            }
            if (td.dom.style.display == "none") {
                td.setDisplayed(true);
            }
            this.indicatorHidden = false;
            if (preventLayout !== true) {
                if (this.autoFitIndicator) {
                    this.indicatorEl.setStyle("width", "");
                }
                this.doComponentLayout();
            }
        }
    },
    hideIndicator: function(preventLayout) {
        if (this.indicatorEl && this.indicatorHidden !== true) {
            var errorSide = this.msgTarget == "side" && this.hasActiveError(),
                td = this.indicatorEl.parent("td");
            if (this.preserveIndicatorIcon && !errorSide) {
                this.indicatorEl.fixDisplay();
                td.dom.style.visibility = 'hidden';
            } else {
                td.setDisplayed(false);
            }
            this.indicatorHidden = true;
            this.errorSideHide = false;
            if (preventLayout !== true) {
                this.needIndicatorRelayout = false;
                this.doComponentLayout();
            } else {
                this.needIndicatorRelayout = true;
            }
        }
    },
    onIndicatorIconClick: function() {
        this.fireEvent("indicatoriconclick", this, this.indicatorEl);
    },
    labelableRenderTpl: ['<tpl if="labelAlign==\'top\'">', '<tr>', '<td role="presentation" id="{id}-labelCell" style="{labelCellStyle}" {labelCellAttrs}>', '{beforeLabelTpl}', '<label id="{id}-labelEl" {labelAttrTpl}<tpl if="inputId"> for="{inputId}"</tpl> class="{labelCls}"', '<tpl if="labelStyle"> style="{labelStyle}"</tpl>', ' unselectable="on"', '>', '{beforeLabelTextTpl}', '<tpl if="fieldLabel">{fieldLabel}{labelSeparator}</tpl>', '{afterLabelTextTpl}', '</label>', '{afterLabelTpl}', '</td>', '<td class="x-indicator-stub"></td>', '<tpl if="msgTarget==\'side\'">', '<td class="x-error-stub" style="display:none" width="{errorIconWidth}"></td>', '</tpl>', '</tr>', '</tpl>', '<tpl if="noteAlign==\'top\'">', '<tr>', '<tpl if="labelOnLeft">', '<td style="{[values.hideLabelCell ? "display:none;" : ""]}width:{labelWidth}px;"></td>', '</tpl>', '<td id="{id}-note">', '<div class="x-field-note {noteCls}">{noteHtml}</div>', '</td>', '<td class="x-indicator-stub"></td>', '<tpl if="msgTarget==\'side\'">', '<td class="x-error-stub" style="display:none" width="{errorIconWidth}"></td>', '</tpl>', '</tr>', '</tpl>', '<tr role="presentation" id="{id}-inputRow" <tpl if="inFormLayout">id="{id}" class="{componentClass}"</tpl> class="{inputRowCls}">', '<tpl if="labelOnLeft">', '<td role="presentation" id="{id}-labelCell" style="{labelCellStyle}" {labelCellAttrs}>', '{beforeLabelTpl}', '<label id="{id}-labelEl" {labelAttrTpl}<tpl if="inputId"> for="{inputId}"</tpl> class="{labelCls}"', '<tpl if="labelStyle"> style="{labelStyle}"</tpl>', ' unselectable="on"', '>', '{beforeLabelTextTpl}', '<tpl if="fieldLabel">{fieldLabel}{labelSeparator}</tpl>', '{afterLabelTextTpl}', '</label>', '{afterLabelTpl}', '</td>', '</tpl>', '<td role="presentation" class="{baseBodyCls} {fieldBodyCls} {extraFieldBodyCls}" id="{id}-bodyEl" role="presentation">', '{beforeBodyEl}', '{beforeSubTpl}', '{[values.$comp.getSubTplMarkup(values)]}', '{afterSubTpl}', '{afterBodyEl}', '</td>', '<td id="{id}-indicator">', '<div style="position:relative;">', '<div class="x-field-indicator {indicatorCls} {indicatorIconCls}">{indicatorHtml}</div>', '</div>', '</td>', '<tpl if="msgTarget==\'side\'">', '<td role="presentation" id="{id}-sideErrorCell" vAlign="{[values.labelAlign===\'top\' && !values.hideLabel ? \'bottom\' : \'middle\']}" style="{[values.autoFitErrors ? \'display:none\' : \'\']}" width="{errorIconWidth}">', '<div role="presentation" id="{id}-errorEl" class="{errorMsgCls}" style="display:none;"></div>', '</td>', '</tpl>', '</tr>', '<tpl if="noteAlign==\'down\'">', '<tr>', '<tpl if="labelOnLeft">', '<td style="{[values.hideLabelCell ? "display:none;" : ""]}width:{labelWidth}px;"></td>', '</tpl>', '<td id="{id}-note">', '<div class="x-field-note {noteCls}">{noteHtml}</div>', '</td>', '<td class="x-indicator-stub"></td>', '<tpl if="msgTarget==\'side\'">', '<td class="x-error-stub" style="display:none" width="{errorIconWidth}"></td>', '</tpl>', '</tr>', '</tpl>', '<tpl if="msgTarget==\'under\'">', '<tr>', '<tpl if="labelOnLeft">', '<td style="{[values.hideLabelCell ? "display:none;" : ""]}width:{labelWidth}px;"></td>', '</tpl>', '<td id="{id}-errorEl" class="{errorMsgClass}" style="display:none"></td>', '<td class="x-indicator-stub"></td>', '</tr>', '</tpl>', {
        disableFormats: true
    }],
    getBodyColspan: function() {
        return 1;
    },
    initRenderData: function() {
        var indicatorIconCls = this.indicatorIconCls && this.indicatorIconCls.indexOf('#') === 0 ? X.net.RM.getIcon(this.indicatorIconCls.substring(1)) : this.indicatorIconCls;
        this.indicatorIconCls = indicatorIconCls;
        this.note = this.noteEncode ? Ext.util.Format.htmlEncode(this.note) : this.note;
        this.isIndicatorActive = !this.isIndicatorEmpty();
        return Ext.applyIf(this.callParent(), {
            noteCls: this.noteCls || "",
            noteAlign: this.note ? (this.noteAlign || "down") : "",
            indicatorCls: this.indicatorCls || "",
            indicatorIconCls: indicatorIconCls || "",
            indicatorHtml: this.indicatorText || "",
            hideLabelCell: this.hideLabel || (!this.fieldLabel && this.hideEmptyLabel),
            noteHtml: this.note || "",
            labelWidth: this.labelWidth + this.labelPad
        });
    },
    applyRenderSelectors: function() {
        var me = this;
        me.callParent();
        me.noteEl = Ext.get(me.id + "-note");
        if (me.noteEl) {
            me.noteEl = me.noteEl.down(".x-field-note");
        }
        me.indicatorEl = Ext.get(me.id + "-indicator");
        if (me.indicatorEl) {
            me.indicatorEl = me.indicatorEl.down(".x-field-indicator");
        }
        if (!me.indicatorEl) {
            return;
        }
        if (me.indicatorTip) {
            me.initIndicatorTip();
        }
        me.indicatorEl.on("click", me.onIndicatorIconClick, me);
        if (me.initialConfig.listeners && me.initialConfig.listeners.indicatoriconclick || me.initialConfig.directEvents && me.initialConfig.directEvents.indicatoriconclick) {
            me.indicatorEl.applyStyles("cursor: pointer;");
        }
        if (this.useHiddenField) {
            this.hiddenField = this.bodyEl.createChild({
                tag: 'input',
                type: 'hidden',
                name: this.getHiddenStateName()
            });
            var val = Ext.isDefined(this.hiddenValue) ? this.hiddenValue : this.getHiddenState(this.getValue());
            this.hiddenField.dom.value = !Ext.isEmpty(val) ? val : "";
            this.checkHiddenStateName();
            this.on("beforedestroy", function() {
                this.hiddenField.destroy();
            }, this);
        }
    },
    getIndicatorStub: function() {
        if (!this.indicatorStub) {
            this.indicatorStub = this.el.select(".x-indicator-stub");
        }
        return this.indicatorStub;
    },
    getErrorStub: function() {
        if (!this.errorStub) {
            this.errorStub = this.el.select(".x-error-stub");
        }
        return this.errorStub;
    },
    initHiddenFieldState: function() {
        if (this.useHiddenField) {
            this.on("change", this.syncHiddenState, this);
        }
    },
    syncHiddenState: function() {
        if (this.hiddenField) {
            var val = this.getHiddenState(this.getValue());
            this.hiddenField.dom.value = val !== null ? val : "";
            this.checkHiddenStateName();
        } else {
            this.hiddenValue = this.getHiddenState(this.getValue());
        }
    },
    initName: function() {
        if (!this.name) {
            this.name = this.id || this.getInputId();
        }
    }
};
Ext.form.field.Base.override(Ext.net.FieldNote);
Ext.form.FieldContainer.override(Ext.net.FieldNote);
Ext.form.field.Base.prototype.initComponent = Ext.Function.createInterceptor(Ext.form.field.Base.prototype.initComponent, Ext.net.FieldNote.initHiddenFieldState);
Ext.form.FieldContainer.prototype.initComponent = Ext.Function.createInterceptor(Ext.form.FieldContainer.prototype.initComponent, Ext.net.FieldNote.initHiddenFieldState);
Ext.form.field.Base.prototype.initComponent = Ext.Function.createInterceptor(Ext.form.field.Base.prototype.initComponent, Ext.net.FieldNote.initName);
Ext.form.FieldContainer.prototype.initComponent = Ext.Function.createInterceptor(Ext.form.FieldContainer.prototype.initComponent, Ext.net.FieldNote.initName);

Ext.override(Ext.form.field.Text, {
    leftButtonsShowMode: "always",
    rightButtonsShowMode: "always",
    isIconIgnore: function() {
        return !!this.el.up(".x-menu-list-item");
    },
    initComponent: function() {
        if (this.inputWidth && !this.width) {
            this._inputWidth = this.inputWidth;
            delete this.inputWidth;
            this.updateInputWidth();
        }
        this.setButtonsHidden = Ext.Function.createBuffered(this.setButtonsHidden, 250, this);
        this.callParent(arguments);
        this.addEvents("iconclick");
    },
    setFieldLabel: function() {
        this.callParent(arguments);
        if (this._inputWidth) {
            this.updateInputWidth(true);
        }
    },
    afterComponentLayout: function() {
        this.callParent(arguments);
        if (this._inputWidth) {
            this.updateInputWidth(true);
        }
    },
    updateInputWidth: function(update) {
        var width = 0;
        if (this.labelAlign !== "top" && (this.fieldLabel || !this.hideEmptyLabel) && !this.hideLabel) {
            width = this.labelWidth + this.labelPad + this._inputWidth;
        } else {
            width = this._inputWidth;
        }
        if (!this.isIndicatorEmpty() || this.preserveIndicatorIcon) {
            if (!this.rendered) {
                var tempEl, indWidth = (tempEl = Ext.getBody().createChild({
                    style: 'position:absolute',
                    cls: "x-field-indicator " + (this.indicatorCls || ""),
                    html: this.indicatorText || ""
                })).getWidth();
                tempEl.remove();
                if (this.indicatorIconCls || this.preserveIndicatorIcon) {
                    indWidth += 18;
                }
                width += indWidth;
            } else {
                width += this.indicatorEl.getWidth();
            }
        }
        this.width = width;
        if (update && this.rendered) {
            this.el.setWidth(width);
        }
    },
    renderIconEl: function() {
        var rtl = this.getHierarchyState().rtl;
        this.inputEl.addCls("x-textfield-icon-input");
        this.icon = Ext.core.DomHelper.append(this.inputCell || this.bodyEl, {
            tag: "div",
            style: "position:relative;margin:0px;padding:0px;border:0px;float:" + (rtl ? "right;" : "left;"),
            children: [{
                tag: "div",
                style: "position:absolute"
            }]
        }, true);
        this.icon = this.icon.first();
        this.icon.on("click", function(e, t) {
            this.fireEvent("iconclick", this, e, t);
        }, this);
    },
    setIconCls: function(cls) {
        if (this.isIconIgnore()) {
            return;
        }
        if (!this.icon) {
            this.renderIconEl();
        }
        if (Ext.isEmpty(cls)) {
            this.inputEl.removeCls("x-textfield-icon-input");
            this.inputEl.repaint();
            this.restoreIconCls = true;
            this.iconCls = "";
            this.icon.dom.className = "";
        } else {
            if (this.restoreIconCls) {
                delete this.restoreIconCls;
                this.inputEl.addCls("x-textfield-icon-input");
                this.inputEl.repaint();
            }
            cls = cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls;
            this.iconCls = cls;
            this.icon.dom.className = "x-textfield-icon " + cls;
        }
    },
    getErrors: function(value) {
        var me = this,
            errors = Ext.form.field.Text.superclass.getErrors.apply(this, arguments),
            regex = me.regex,
            format = Ext.String.format,
            msg, trimmed, isBlank;
        value = value || me.processRawValue(me.getRawValue());
        trimmed = me.allowOnlyWhitespace ? value : Ext.String.trim(value);
        if (trimmed.length < 1 || (value === me.emptyText && me.valueContainsPlaceholder)) {
            if (!me.allowBlank) {
                errors.push(me.blankText);
            }
            if (!me.validateBlank) {
                return errors;
            }
            isBlank = true;
        }
        if (!isBlank && value.length < me.minLength) {
            errors.push(format(me.minLengthText, me.minLength));
        }
        if (value.length > me.maxLength) {
            errors.push(format(me.maxLengthText, me.maxLength));
        }
        if (regex && !regex.test(value)) {
            errors.push(me.regexText || me.invalidText);
        }
        return errors;
    },
    afterRender: function() {
        this.callParent(arguments);
        if (this.iconCls) {
            var iconCls = this.iconCls;
            delete this.iconCls;
            this.setIconCls(iconCls);
        }
        if (this.removeClearTrigger) {
            this.inputEl.addCls("x-clear-field");
        }
        this.initButtons();
    },
    updateButtonsWidth: function() {
        if (this.bulkButtonsUpdate) {
            this.needUpdateAfterBulk = true;
            return;
        }
        var field = this,
            el;
        if (field.leftButtons || field.rightButtons) {
            if (!field.isButtonsInit) {
                field.initButtons(false);
            }
            var w = 0,
                i, len;
            if (field.leftButtons) {
                for (i = 0, len = field.leftButtons.length; i < len; i++) {
                    w = w + field.leftButtons[i].getWidth();
                }
            }
            if (field.rightButtons) {
                for (i = 0, len = field.rightButtons.length; i < len; i++) {
                    w = w + field.rightButtons[i].getWidth();
                }
            }
            el = field.inputEl;
            w = el.parent().getWidth() - w - (field.buttonsOffset || 3);
            if (w != el.getWidth()) {
                el.setWidth(w);
            }
        }
    },
    initButtons: function(doLayout) {
        if (this.leftButtons) {
            this.leftButtons = this.initButtonsSide(this.leftButtons, "left");
        }
        if (this.rightButtons) {
            this.rightButtons = this.initButtonsSide(this.rightButtons, "right");
        }
        if (this.leftButtonsShowMode == "mouseover" || this.leftButtonsShowMode == "mouseovernonblank" || this.leftButtonsShowMode == "mouseoverorfocus" || this.rightButtonsShowMode == "mouseover" || this.rightButtonsShowMode == "mouseovernonblank" || this.rightButtonsShowMode == "mouseoverorfocus") {
            this.bodyEl.on({
                mouseover: this.onMouseOver,
                mouseout: this.onMouseOut,
                scope: this
            });
        }
        if (doLayout !== false && (this.leftButtons || this.rightButtons)) {
            this.doComponentLayout();
        }
        this.isButtonsInit = true;
    },
    isButtonsVisible: function(side) {
        var mode = this[side + "ButtonsShowMode"];
        switch (mode) {
            case "focus":
                return this.hasFocus;
            case "mouseover":
                return this.hasMouse;
            case "nonblank":
                return this.getRawValue().length > 0;
            case "mouseovernonblank":
                return this.hasMouse && this.getRawValue().length > 0;
            case "mouseoverorfocus":
                return this.hasMouse || this.hasFocus;
            case "always":
            default:
                return true;
        }
    },
    addButton: function(button, side, doLayout) {
        side = side || "right";
        button.flat = true;
        button.style = "float:" + side + ";";
        button.height = 20;
        if (this[side + "ButtonsShowMode"] != "always") {
            button.hidden = !this.isButtonsVisible(side);
        }
        if (!this.initButtonsCls) {
            (this.inputCell || this.bodyEl).addCls(["x-form-field", "x-form-text", "x-field-buttons-body"]);
            this.bodyEl.addCls("x-field-toolbar-body");
            this.inputEl.addCls = Ext.Function.createSequence(this.inputEl.addCls, function(cls) {
                (this.inputCell || this.bodyEl).addCls(cls);
            }, this);
            this.inputEl.removeCls = Ext.Function.createSequence(this.inputEl.removeCls, function(cls) {
                (this.inputCell || this.bodyEl).removeCls(cls);
            }, this);
            this.initButtonsCls = true;
        }
        var btn = Ext.ComponentManager.create(button, "button");
        btn.field = this;
        btn.fieldSide = side;
        btn.ownerCt = this;
        btn.on("destroy", function(btn) {
            if (this.isDestroying) {
                return;
            }
            Ext.Array.remove(btn.fieldSide === "right" ? this.rightButtons : this.leftButtons, btn);
            Ext.defer(this.doComponentLayout, 1, this);
        }, this);
        btn.on({
            show: this.updateButtonsWidth,
            hide: this.updateButtonsWidth,
            resize: this.updateButtonsWidth,
            scope: this
        });
        btn.render(this.inputCell || this.bodyEl, side == "left" ? this.inputEl : undefined);
        if (doLayout !== false) {
            this.doComponentLayout();
        }
        return btn;
    },
    removeButton: function(button) {
        button.destroy();
    },
    initButtonsSide: function(buttons, side) {
        var i, len;
        if (side == "right") {
            len = buttons.length;
            i = len - 1;
            for (; i >= 0; i--) {
                buttons[i] = this.addButton(buttons[i], side, false);
            }
        } else {
            for (i = 0, len = buttons.length; i < len; i++) {
                buttons[i] = this.addButton(buttons[i], side, false);
            }
        }
        return buttons;
    },
    destroy: function() {
        this.isDestroying = true;
        if (this.leftButtons) {
            Ext.each(this.leftButtons, function(btn) {
                if (btn.destroy) {
                    btn.destroy();
                }
            });
            delete this.leftButtons;
        }
        if (this.rightButtons) {
            Ext.each(this.rightButtons, function(btn) {
                if (btn.destroy) {
                    btn.destroy();
                }
            });
            delete this.rightButtons;
        }
        this.callParent(arguments);
    },
    setButtonsDisabled: function(disabled, side) {
        if (this.leftButtons && (!Ext.isDefined(side) || side == "left")) {
            Ext.each(this.leftButtons, function(btn) {
                btn.setDisabled(disabled);
            });
        }
        if (this.rightButtons && (!Ext.isDefined(side) || side == "right")) {
            Ext.each(this.rightButtons, function(btn) {
                btn.setDisabled(disabled);
            });
        }
    },
    setButtonsHidden: function(hidden, side) {
        var method = !hidden ? "show" : "hide";
        this.bulkButtonsUpdate = true;
        if (this.leftButtons && (!Ext.isDefined(side) || side == "left")) {
            Ext.each(this.leftButtons, function(btn) {
                if (!btn.hiddenPin) {
                    btn[method](false);
                }
            });
        }
        if (this.rightButtons && (!Ext.isDefined(side) || side == "right")) {
            Ext.each(this.rightButtons, function(btn) {
                if (!btn.hiddenPin) {
                    btn[method](false);
                }
            });
        }
        this.bulkButtonsUpdate = false;
        if (this.needUpdateAfterBulk) {
            delete this.needUpdateAfterBulk;
            this.updateButtonsWidth();
        }
    },
    onDisable: function() {
        this.callParent();
        this.setButtonsDisabled(true);
    },
    onEnable: function() {
        this.callParent();
        this.setButtonsDisabled(false);
    },
    onFocus: function() {
        this.callParent(arguments);
        if (this.leftButtons && (this.leftButtonsShowMode == "focus" || this.leftButtonsShowMode == "mouseoverorfocus")) {
            this.setButtonsHidden(false, "left");
        }
        if (this.rightButtons && (this.rightButtonsShowMode == "focus" || this.rightButtonsShowMode == "mouseoverorfocus")) {
            this.setButtonsHidden(false, "right");
        }
    },
    postBlur: function() {
        this.callParent(arguments);
        if (this.leftButtons && (this.leftButtonsShowMode == "focus" || (this.leftButtonsShowMode == "mouseoverorfocus" && !this.hasMouse))) {
            this.setButtonsHidden(true, "left");
        }
        if (this.rightButtons && (this.rightButtonsShowMode == "focus" || (this.rightButtonsShowMode == "mouseoverorfocus" && !this.hasMouse))) {
            this.setButtonsHidden(true, "right");
        }
    },
    onMouseOver: function() {
        this.hasMouse = true;
        if (this.leftButtons && (this.leftButtonsShowMode == "mouseover" || this.leftButtonsShowMode == "mouseoverorfocus" || (this.leftButtonsShowMode == "mouseovernonblank" && this.getRawValue().length > 0))) {
            this.setButtonsHidden(false, "left");
        }
        if (this.rightButtons && (this.rightButtonsShowMode == "mouseover" || this.rightButtonsShowMode == "mouseoverorfocus" || (this.rightButtonsShowMode == "mouseovernonblank" && this.getRawValue().length > 0))) {
            this.setButtonsHidden(false, "right");
        }
    },
    onMouseOut: function() {
        this.hasMouse = false;
        if (this.leftButtons && (this.leftButtonsShowMode == "mouseover" || (this.leftButtonsShowMode == "mouseoverorfocus" && !this.hasFocus) || this.leftButtonsShowMode == "mouseovernonblank")) {
            this.setButtonsHidden(true, "left");
        }
        if (this.rightButtons && (this.rightButtonsShowMode == "mouseover" || (this.rightButtonsShowMode == "mouseoverorfocus" && !this.hasFocus) || this.rightButtonsShowMode == "mouseovernonblank")) {
            this.setButtonsHidden(true, "right");
        }
    },
    onChange: function() {
        var nonEmpty;
        this.callParent(arguments);
        if (this.leftButtons && (this.leftButtonsShowMode == "nonblank" || this.leftButtonsShowMode == "mouseovernonblank")) {
            nonEmpty = this.getRawValue().length > 0;
            if ((this.leftButtonsShowMode == "nonblank" && nonEmpty) || (this.leftButtonsShowMode == "mouseovernonblank" && nonEmpty && this.hasMouse)) {
                this.setButtonsHidden(false, "left");
            } else {
                this.setButtonsHidden(true, "left");
            }
        }
        if (this.rightButtons && (this.rightButtonsShowMode == "nonblank" || this.rightButtonsShowMode == "mouseovernonblank")) {
            nonEmpty = this.getRawValue().length > 0;
            if ((this.rightButtonsShowMode == "nonblank" && nonEmpty) || (this.rightButtonsShowMode == "mouseovernonblank" && nonEmpty && this.hasMouse)) {
                this.setButtonsHidden(false, "right");
            } else {
                this.setButtonsHidden(true, "right");
            }
        }
    }
});

Ext.form.Checkbox.override({
    useHiddenField: true,
    includeHiddenStateToSubmitData: false,
    submitEmptyHiddenState: false,
    onRender: function() {
        delete this.inputWidth;
        this.callParent(arguments);
        this.applyBoxLabelCss();
    },
    getHiddenState: function(value) {
        return this.getSubmitValue();
    },
    getHiddenStateName: function() {
        return this.getName();
    },
    initValue: function() {
        var me = this,
            checked = !!me.checked;
        if (!me.checked && (me.value === true || me.value === "true")) {
            me.checked = checked = true;
        }
        me.originalValue = me.lastValue = checked;
        me.setValue(checked);
    },
    applyBoxLabelCss: function() {
        if (this.boxLabelClsExtra) {
            this.setBoxLabelCls(this.boxLabelClsExtra);
        }
        if (this.boxLabelStyle) {
            this.setBoxLabelStyle(this.boxLabelStyle);
        }
    },
    setBoxLabelStyle: function(style) {
        this.boxLabelStyle = style;
        if (this.boxLabelEl) {
            this.boxLabelEl.applyStyles(style);
        }
    },
    setBoxLabelCls: function(cls) {
        if (this.boxLabelEl && this.boxLabelClsExtra) {
            this.boxLabelEl.removeCls(this.boxLabelClsExtra);
        }
        this.boxLabelClsExtra = cls;
        if (this.boxLabelEl) {
            this.boxLabelEl.addCls(this.boxLabelClsExtra);
        }
    },
    setBoxLabel: function(label) {
        this.boxLabel = label;
        if (this.rendered) {
            if (this.boxLabelEl) {
                this.boxLabelEl.update(label);
            } else {
                this.boxLabelEl = this.bodyEl.createChild({
                    tag: "label",
                    "for": this.el.id,
                    cls: Ext.baseCSSPrefix + "form-cb-label",
                    html: this.boxLabel
                });
                this.applyBoxLabelCss();
            }
        }
    }
});

Ext.form.CheckboxGroup.override({
    invalidCls: Ext.baseCSSPrefix + 'form-invalid'
});
Ext.form.CheckboxGroup.prototype.onRender = Ext.Function.createSequence(Ext.form.CheckboxGroup.prototype.onRender, function(ct, position) {
    if (this.fireChangeOnLoad) {
        var checked = false;
        this.eachBox(function(item) {
            if (item.checked) {
                checked = true;
                return false;
            }
        });
        if (checked) {
            this.checkChange();
        }
    }
});

Ext.form.field.Trigger.override({
    getTriggerMarkup: function() {
        var triggersConfig = this.triggersConfig ? Ext.Array.clone(this.triggersConfig) : [],
            unselectableCls = Ext.dom.Element.unselectableCls;
        if (this.triggerCls) {
            triggerCfg = {
                iconCls: this.triggerCls,
                special: true
            };
            if (this.hideBaseTrigger) {
                triggerCfg.style = "display:none;";
            }
            triggersConfig[this.firstBaseTrigger ? "unshift" : "push"](triggerCfg);
        }
        for (i = 0;
            (triggerCls = this['trigger' + (i + 1) + 'Cls']) || i < 1; i++) {
            if (triggerCls) {
                triggerCfg = {
                    iconCls: triggerCls,
                    special: true
                };
                if (this.hideBaseTrigger) {
                    triggerCfg.style = "display:none;";
                }
                triggersConfig.push(triggerCfg);
            }
        }
        if (triggersConfig) {
            var cn = [],
                isSimple, foundVisible = false,
                firstIsSimple = false;
            for (i = 0; i < triggersConfig.length; i++) {
                var trigger = triggersConfig[i],
                    triggerIcon = trigger.iconCls || this.triggerCls;
                triggerCfg = {
                    tag: 'td',
                    valign: 'top',
                    cls: this.extraTriggerCls + ' ' + Ext.baseCSSPrefix + 'trigger-cell ' + unselectableCls,
                    style: 'width:' + this.triggerWidth + 'px;',
                    cn: {
                        cls: [Ext.baseCSSPrefix + 'trigger-index-' + i, this.triggerBaseCls, triggerIcon].join(' '),
                        role: 'button'
                    }
                };
                if (trigger.tag) {
                    triggerCfg.cn.tid = trigger.tag;
                }
                if (trigger.qtip) {
                    triggerCfg.cn["data-qtip"] = trigger.qtip;
                }
                if (trigger.special) {
                    triggerCfg.cn.special = 1;
                }
                if (Ext.net.StringUtils.startsWith(triggerIcon || "", "x-form-simple")) {
                    if (i != (triggersConfig.length - 1) && Ext.net.ResourceMgr.theme !== "neptune") {
                        triggerCfg.style += "width:16px;";
                    }
                    if (Ext.net.ResourceMgr.theme == "neptune") {
                        triggerCfg.style += "width:18px;";
                        triggerCfg.cn.style = "width:18px;";
                        this.triggerWidth = 18;
                    }
                    triggerCfg.cn.simple = true;
                    isSimple = true;
                    if (!trigger.hideTrigger && !foundVisible) {
                        firstIsSimple = true;
                    }
                }
                if (trigger.hideTrigger) {
                    triggerCfg.style += "display:none;";
                } else {
                    foundVisible = true;
                }
                if (trigger.style) {
                    triggerCfg.style += trigger.style;
                }
                if (i == 0) {
                    triggerCfg.cn.cls += ' ' + this.triggerBaseCls + '-first';
                }
                cn.push(triggerCfg);
            }
            if (firstIsSimple && !this.hideTrigger && !this.readOnly) {
                this.on("afterrender", function() {
                    this.inputEl.setStyle({
                        "border-right-width": "0px"
                    });
                }, this, {
                    single: true
                });
            }
            return Ext.DomHelper.markup(cn);
        }
    },
    initComponent: function() {
        this.callParent();
        this.addEvents("triggerclick");
    },
    initEvents: function() {
        this.callParent();
        if (Ext.isNumeric(this.triggerIndexOnEnter)) {
            this.on("specialkey", this.onSpecialKey);
        }
    },
    onSpecialKey: function(triggerField, e) {
        if (e.getKey() === e.ENTER) {
            var index = triggerField.triggerIndexOnEnter;
            trigger = triggerField.getTrigger(index, false);
            if (trigger && trigger.parent().isVisible()) {
                triggerField.fireEvent("triggerclick", triggerField, trigger.parent(), index, trigger.getAttribute("tid"), e);
            }
        }
    },
    afterRender: function() {
        Ext.form.field.Trigger.superclass.afterRender.call(this, arguments);
        this.triggerCell.each(function(item) {
            item.setVisibilityMode(Ext.Element.DISPLAY);
        });
        if (this.readOnly || this.hideTrigger) {
            this.triggerCell.addCls("x-hide-display");
        }
    },
    getTrigger: function(index, ct) {
        return ct !== false ? this.triggerEl.item(index).parent() : this.triggerEl.item(index);
    },
    removeBorderIfSimple: function() {
        var first, i, len, isSimple;
        for (i = 0, len = this.triggerEl.getCount(); i < len; i++) {
            first = this.triggerEl.item(i);
            if (first.parent().isVisible() && first.getAttribute("simple")) {
                isSimple = first.getAttribute("simple");
                break;
            }
        }
        if (isSimple && !this.hideTrigger && !this.readOnly) {
            this.inputEl.setStyle({
                "border-right-width": "0px"
            });
        } else {
            this.inputEl.setStyle({
                "border-right-width": "1px"
            });
        }
    },
    toggleTrigger: function(index, state) {
        var trigger = this.getTrigger(index);
        if (!Ext.isBoolean(state)) {
            state = !trigger.isVisible();
        }
        trigger[state ? "show" : "hide"]();
        this.removeBorderIfSimple();
    },
    onTriggerWrapClick: function() {
        var me = this,
            e = arguments[me.triggerRepeater ? 1 : 0],
            t = e && e.getTarget('.' + me.triggerBaseCls, null),
            match = t && t.className.match(me.triggerIndexRe),
            idx, special, tdefault, triggerClickMethod;
        if (match && !me.readOnly && !me.disabled) {
            idx = parseInt(match[1], 10);
            special = t.getAttribute("special");
            if (special) {
                triggerClickMethod = me['onTrigger' + (idx + 1) + 'Click'] || me.onTriggerClick;
                if (triggerClickMethod) {
                    triggerClickMethod.call(me, e);
                }
            } else {
                this.onCustomTriggerClick(e, {
                    index: idx,
                    tag: t.getAttribute("tid")
                });
            }
        }
    },
    onCustomTriggerClick: function(evt, o) {
        if (!this.disabled) {
            this.fireEvent("triggerclick", this, this.getTrigger(o.index), o.index, o.tag, evt);
        }
    },
    setBaseDisplayed: function(display) {
        this.triggerEl.each(function(item) {
            if (item.getAttribute("special")) {
                item.parent().setStyle({
                    display: display ? "block" : "none"
                });
            }
        });
    },
    getTriggerWidth: function() {
        var me = this,
            totalTriggerWidth = 0;
        if (me.triggerWrap && !me.hideTrigger && !me.readOnly) {
            me.triggerCell.each(function(item) {
                if (item.isVisible() && !item.hasCls("x-hide-display")) {
                    totalTriggerWidth += me.triggerWidth;
                }
            });
        }
        return totalTriggerWidth;
    }
});
Ext.form.field.Trigger.getIcon = function(icon) {
    var iconName = icon.toLowerCase(),
        key = "x-form-" + iconName + "-trigger";
    if (iconName !== "combo" && iconName !== "clear" && iconName !== "date" && iconName !== "search") {
        if (!this.registeredIcons) {
            this.registeredIcons = {};
        }
        if (!this.registeredIcons[key]) {
            this.registeredIcons[key] = true;
            var sepName = Ext.net.ResourceMgr.toCharacterSeparatedFileName(icon, "-"),
                template = "/{0}extnet/resources/images/triggerfield/{1}-gif/ext.axd",
                appName = Ext.isEmpty(Ext.net.ResourceMgr.appName, false) ? "" : (Ext.net.ResourceMgr.appName + "/"),
                url, url1 = "",
                css = ".x-trigger-cell .{0}{background-image:url({1});cursor:pointer;}";
            if (Ext.net.ResourceMgr.theme == "gray" && (icon == "Ellipsis" || icon == "Empty")) {
                template = "/{0}extnet/resources/images/triggerfield/gray/{1}-gif/ext.axd";
            }
            if (Ext.net.ResourceMgr.theme == "neptune") {
                template = "/{0}extnet/resources/images/triggerfield/neptune/{1}-png/ext.axd";
            }
            url = Ext.net.StringUtils.format(template, appName, sepName);
            if (Ext.net.ResourceMgr.theme !== "neptune" && !Ext.isWebKit && Ext.net.StringUtils.startsWith(icon, "Simple")) {
                template = "/{0}extnet/resources/images/triggerfield/{1}-small-gif/ext.axd";
                url1 = Ext.net.StringUtils.format(template, appName, sepName);
                css += " .x-small-editor .x-trigger-cell .{0}{{background-image:url({2});cursor:pointer;}}";
            }
            css = Ext.net.StringUtils.format(css, key, url, url1);
            Ext.net.ResourceMgr.registerCssClass("trigger_" + key, css);
        }
    }
    return key;
};
Ext.layout.component.field.Trigger.override({
    updateEditState: function() {
        var me = this,
            owner = me.owner,
            inputEl = owner.inputEl,
            noeditCls = Ext.baseCSSPrefix + 'trigger-noedit',
            displayed, readOnly;
        if (me.owner.readOnly) {
            inputEl.addCls(noeditCls);
            readOnly = true;
            displayed = false;
        } else {
            if (me.owner.editable) {
                inputEl.removeCls(noeditCls);
                readOnly = false;
            } else {
                inputEl.addCls(noeditCls);
                readOnly = true;
            }
            displayed = !me.owner.hideTrigger;
        }
        owner.triggerCell[displayed ? "removeCls" : "addCls"]("x-hide-display");
        inputEl.dom.readOnly = readOnly;
    }
});

Ext.form.field.Spinner.override({
    onRender: function() {
        this.callParent(arguments);
        this.triggerCell = new Ext.dom.CompositeElement(this.el.down(".x-trigger-index-0").up("td"), this.el);
    },
    getTriggerData: function() {
        var me = this;
        return {
            triggerCls: Ext.baseCSSPrefix + 'trigger-cell',
            spinnerUpCls: !me.spinUpEnabled ? me.trigger1Cls + '-disabled' : '',
            spinnerDownCls: !me.spinDownEnabled ? me.trigger2Cls + '-disabled' : ''
        };
    },
    onTriggerWrapClick: function() {
        var me = this,
            targetEl, match, triggerClickMethod, event;
        event = arguments[me.triggerRepeater ? 1 : 0];
        if (event && !me.readOnly && !me.disabled) {
            targetEl = event.getTarget('.' + me.triggerBaseCls, null);
            match = targetEl && targetEl.className.match(me.triggerIndexRe);
            if (match) {
                triggerClickMethod = me['onTrigger' + (parseInt(match[1], 10) + 1) + 'Click'] || me.onTriggerClick;
                if (triggerClickMethod) {
                    triggerClickMethod.call(me, event);
                }
            }
        }
    }
});


Ext.form.field.ComboBox.override({
    alwaysMergeItems: true,
    useHiddenField: true,
    simpleSubmit: false,
    initComponent: Ext.Function.createSequence(Ext.form.field.ComboBox.prototype.initComponent, function() {
        this.initMerge();
        this.includeHiddenStateToSubmitData = !this.simpleSubmit;
        if (!Ext.isEmpty(this.selectedItems) && this.store) {
            this.setInitValue(this.selectedItems);
        }
    }),
    getHiddenStateName: function() {
        return this.valueHiddenName || ("_" + this.getName() + "_state");
    },
    getSubmitArray: function() {
        var state = [],
            value, record;
        if (!this.valueModels || this.valueModels.length == 0) {
            value = this.getValue();
            if (!Ext.isEmpty(value)) {
                record = this.findRecordByValue(value);
                if (!record) {
                    this.store.on("load", this.syncHiddenState, this, {
                        single: true
                    });
                    return [{
                        value: value
                    }];
                }
                return [{
                    value: record.get(this.valueField),
                    text: record.get(this.displayField),
                    index: this.store.indexOf(record)
                }];
            }
            return state;
        }
        Ext.each(this.valueModels, function(model) {
            state.push({
                value: model.get(this.valueField),
                text: model.get(this.displayField),
                index: this.store.indexOf(model)
            });
        }, this);
        return state;
    },
    getHiddenState: function(value) {
        if (this.simpleSubmit) {
            return this.getValue();
        }
        var state = this.getSubmitArray();
        return state.length > 0 ? Ext.encode(state) : "";
    },
    initMerge: function() {
        if (this.mergeItems) {
            if (this.store.getCount() > 0) {
                this.doMerge();
            }
            if (this.store.getCount() === 0 || this.alwaysMergeItems) {
                this.store.on("load", this.doMerge, this, {
                    single: !this.alwaysMergeItems
                });
            }
        }
    },
    doMerge: function() {
        for (var mi = this.mergeItems.length - 1; mi > -1; mi--) {
            var f = this.store.model.prototype.fields,
                dv = {};
            for (var i = 0; i < f.length; i++) {
                dv[f.items[i].name] = f.items[i].defaultValue;
            }
            if (!Ext.isEmpty(this.displayField, false)) {
                dv[this.displayField] = this.mergeItems[mi][1];
            }
            if (!Ext.isEmpty(this.valueField, false) && this.displayField != this.valueField) {
                dv[this.valueField] = this.mergeItems[mi][0];
            }
            this.store.insert(0, new this.store.model(dv));
        }
    },
    addRecord: function(values) {
        var rowIndex = this.store.data.length,
            record = this.insertRecord(rowIndex, values);
        return {
            index: rowIndex,
            record: record
        };
    },
    addItem: function(text, value) {
        var rowIndex = this.store.data.length,
            record = this.insertItem(rowIndex, text, value);
        return {
            index: rowIndex,
            record: record
        };
    },
    insertRecord: function(rowIndex, values) {
        this.store.clearFilter(true);
        values = values || {};
        var f = this.store.model.prototype.fields,
            dv = {};
        for (var i = 0; i < f.length; i++) {
            dv[f.items[i].name] = f.items[i].defaultValue;
        }
        var record = new this.store.model(dv, values[this.store.proxy.reader.getIdProperty()]);
        this.store.insert(rowIndex, record);
        for (var v in values) {
            record.set(v, values[v]);
        }
        if (!Ext.isEmpty(this.store.proxy.reader.getIdProperty())) {
            record.set(this.store.proxy.reader.getIdProperty(), record.getId());
        }
        return record;
    },
    insertItem: function(rowIndex, text, value) {
        var f = this.store.model.prototype.fields,
            dv = {};
        for (var i = 0; i < f.length; i++) {
            dv[f.items[i].name] = f.items[i].defaultValue;
        }
        if (!Ext.isEmpty(this.displayField, false)) {
            dv[this.displayField] = text;
        }
        if (!Ext.isEmpty(this.valueField, false) && this.displayField != this.valueField) {
            dv[this.valueField] = value;
        }
        var record = new this.store.model(dv);
        this.store.insert(rowIndex, record);
        return record;
    },
    removeByField: function(field, value) {
        var index = this.store.find(field, value);
        if (index < 0) {
            return;
        }
        this.store.remove(this.store.getAt(index));
    },
    removeByIndex: function(index) {
        if (index < 0 || index >= this.store.getCount()) {
            return;
        }
        this.store.remove(this.store.getAt(index));
    },
    removeByValue: function(value) {
        this.removeByField(this.valueField, value);
    },
    removeByText: function(text) {
        this.removeByField(this.displayField, text);
    },
    setValueAndFireSelect: function(v) {
        this.setValue(v);
        this.fireEvent("select", this, this.valueModels);
    },
    setInitValue: function(value) {
        var set = Ext.Function.bind(function(value) {
            this.setSelectedItems(value, this.fireChangeOnLoad);
            this.resetOriginalValue();
        }, this, [value]);
        if (this.store.getCount() > 0) {
            set();
        } else {
            this.store.on("load", set, this, {
                single: true
            });
        }
    },
    onLoad: Ext.Function.createInterceptor(Ext.form.ComboBox.prototype.onLoad, function() {
        if (this.mode == "single") {
            this.mode = "local";
        }
    }),
    createPicker: Ext.Function.createSequence(Ext.form.ComboBox.prototype.createPicker, function() {
        if (this.mode == "single" && this.store.getCount() > 0) {
            this.mode = "local";
        }
    }),
    setSelectedItems: function(items, fireChange) {
        if (items) {
            items = Ext.Array.from(items);
            var rec, values = [];
            Ext.each(items, function(item) {
                if (Ext.isDefined(item.value)) {
                    rec = this.findRecordByValue(item.value);
                    if (!rec && !isNaN(parseInt(item.value, 10)) && isFinite(item.value)) {
                        rec = this.findRecordByValue(parseInt(item.value, 10));
                    }
                    if (rec) {
                        values.push(rec);
                    }
                } else if (Ext.isDefined(item.text)) {
                    rec = this.findRecordByDisplay(item.text);
                    if (rec) {
                        values.push(rec);
                    }
                } else if (Ext.isDefined(item.index)) {
                    rec = this.store.getAt(item.index);
                    if (rec) {
                        values.push(rec);
                    }
                }
            }, this);
            if (fireChange !== false) {
                this.setValue(values);
            } else {
                this.suspendCheckChange++;
                this.setValue(values);
                this.suspendCheckChange--;
            }
            if (this.fireSelectOnLoad) {
                this.fireEvent("select", this, this.valueModels);
            }
        }
    },
    onUnbindStore: function(store) {
        var me = this,
            picker = me.picker;
        if (me.queryFilter && !store.isDestroyed) {
            me.store.removeFilter(me.queryFilter);
        }
        if (!store && picker) {
            picker.bindStore(null);
        }
    }
});

Ext.form.action.Load.override({
    onSuccess: function(response) {
        var result = this.processResponse(response),
            form = this.form;
        if (result === true || !result.success || !result.data) {
            if (this.simpleObject && result !== true) {
                result = {
                    data: result
                };
            } else {
                this.failureType = Ext.form.action.Action.LOAD_FAILURE;
                form.afterAction(this, false);
                return;
            }
        }
        form.clearInvalid();
        form.setValues(result.data);
        form.afterAction(this, true);
    }
});
Ext.form.action.Submit.override({
    onSuccess: function(response) {
        if (this.allowNoContent && response.status === 204 || response.status === 202 || response.status === 1223) {
            this.form.afterAction(this, true);
        } else {
            this.callParent(arguments);
        }
    }
});
Ext.form.Basic.override({
    prefixRegex: /[^.]+$/,
    onFieldAdd: function(field) {
        var me = this;
        me.mon(field, 'change', me.fireFieldChange, me);
        me.callParent(arguments);
    },
    onFieldRemove: function(field) {
        var me = this;
        me.mun(field, 'change', me.fireFieldChange, me);
        me.callParent(arguments);
    },
    fireFieldChange: function(field, newValue, oldValue) {
        var me = this;
        me.owner.fireEvent('fieldchange', me.owner, field, newValue, oldValue);
    },
    removePrefix: function(name) {
        if (Ext.isEmpty(name) || !Ext.net.ResourceMgr.isMVC) {
            return name;
        }
        var match = name.match(this.prefixRegex);
        return match ? match[0] : name;
    },
    findField: function(id) {
        var withoutPrefixId = this.removePrefix(id);
        return this.getFields().findBy(function(f) {
            return (f.getItemId() === id || f.getName() === id || (f.dataIndex && (id.indexOf(".") > -1 ? (f.dataIndex === id) : (f.dataIndex.split(".")[0] === id))) || this.removePrefix(f.getName()) === withoutPrefixId);
        }, this);
    },
    findMappingFields: function(id) {
        var fields = [];
        this.getFields().each(function(f) {
            if (f.dataIndex && f.dataIndex.split(".")[0] === id) {
                fields.push(f);
            }
        }, this);
        return fields;
    },
    getFieldValues: function(dirtyOnly, removePrefix, disableMapping) {
        return this.getValues(false, dirtyOnly, false, true, removePrefix, disableMapping);
    },
    setValues: function(values) {
        var me = this,
            v, vLen, val, field;

        function setVal(fieldId, val) {
            var field = me.findField(fieldId),
                map_fields, notFound, v;
            if (field) {
                var mapping = field.dataIndex && field.dataIndex.split(".");
                if (mapping && mapping[0] === fieldId) {
                    map_fields = me.findMappingFields(fieldId);
                    for (var f = 0; f < map_fields.length; f++) {
                        field = map_fields[f];
                        mapping = field.dataIndex && field.dataIndex.split(".");
                        v = val;
                        notFound = false;
                        for (var i = 1; i < mapping.length; i++) {
                            if (v.hasOwnProperty(mapping[i])) {
                                v = v[mapping[i]];
                            } else {
                                notFound = true;
                                break;
                            }
                        }
                        if (!notFound) {
                            field.setValue(v);
                            if (me.trackResetOnLoad) {
                                field.resetOriginalValue();
                            }
                        }
                    }
                } else {
                    field.setValue(val);
                    if (me.trackResetOnLoad) {
                        field.resetOriginalValue();
                    }
                }
            }
        }
        Ext.suspendLayouts();
        if (Ext.isArray(values)) {
            vLen = values.length;
            for (v = 0; v < vLen; v++) {
                val = values[v];
                setVal(val.id, val.value);
            }
        } else {
            Ext.iterate(values, setVal);
        }
        Ext.resumeLayouts(true);
        return this;
    },
    getValues: function(asString, dirtyOnly, includeEmptyText, useDataValues, removePrefix, disableMapping) {
        var values = {},
            fields = this.getFields().items,
            f, fLen = fields.length,
            isArray = Ext.isArray,
            mapping, obj_holder, field, data, val, bucket, name, withoutPrefixName;
        for (f = 0; f < fLen; f++) {
            field = fields[f];
            if (!dirtyOnly || field.isDirty()) {
                data = field[useDataValues ? 'getModelData' : 'getSubmitData'](includeEmptyText);
                if (Ext.isObject(data)) {
                    for (name in data) {
                        if (data.hasOwnProperty(name)) {
                            val = data[name];
                            if (includeEmptyText && val === '') {
                                val = field.emptyText || '';
                            }
                            withoutPrefixName = removePrefix === true ? this.removePrefix(name) : name;
                            if (useDataValues && disableMapping !== true && field.dataIndex) {
                                mapping = field.dataIndex.split(".");
                                obj_holder = values;
                                for (var i = 0; i < mapping.length - 1; i++) {
                                    if (!obj_holder.hasOwnProperty(mapping[i])) {
                                        obj_holder[mapping[i]] = {};
                                    }
                                    obj_holder = obj_holder[mapping[i]];
                                }
                                obj_holder[mapping[mapping.length - 1]] = val;
                            } else if (values.hasOwnProperty(withoutPrefixName)) {
                                bucket = values[withoutPrefixName];
                                if (!isArray(bucket)) {
                                    bucket = values[withoutPrefixName] = [bucket];
                                }
                                if (isArray(val)) {
                                    values[withoutPrefixName] = values[withoutPrefixName] = bucket.concat(val);
                                } else {
                                    bucket.push(val);
                                }
                            } else {
                                values[withoutPrefixName] = val;
                            }
                        }
                    }
                }
            }
        }
        if (asString) {
            values = Ext.Object.toQueryString(values);
        }
        return values;
    },
    updateRecord: function(record, disableMapping) {
        if (!record) {
            record = this._record;
        }
        var fields = record.fields.items,
            values = this.getFieldValues(false, true, disableMapping),
            obj = {},
            i = 0,
            len = fields.length,
            name;
        for (; i < len; ++i) {
            name = fields[i].name;
            if (values.hasOwnProperty(name)) {
                obj[name] = values[name];
            }
        }
        record.beginEdit();
        record.set(obj);
        record.endEdit();
        return this;
    },
    afterAction: function(action, success) {
        this.callParent(arguments);
        if (action.result && action.result.script && action.result.script.length > 0) {
            if (window.execScript) {
                window.execScript(action.result.script);
            } else {
                window.eval.call(window, action.result.script);
            }
        }
    },
    getBoundRecord: function() {
        return this._record;
    }
});

Ext.form.field.Date.override({
    initComponent: function() {
        if (!Ext.isDefined(this.initialConfig.startDay)) {
            this.startDay = Ext.picker.Date.prototype.startDay;
        }
        this.callParent();
    },
    createPicker: function() {
        var me = this,
            isMonth = this.type == "month",
            format = Ext.String.format,
            pickerConfig, monthPickerOptions;
        if (me.okText) {
            monthPickerOptions = monthPickerOptions || {};
            monthPickerOptions.okText = me.okText;
        }
        if (me.cancelText) {
            monthPickerOptions = monthPickerOptions || {};
            monthPickerOptions.cancelText = me.cancelText;
        }
        if (isMonth) {
            pickerConfig = {
                ownerCt: me.ownerCt,
                renderTo: document.body,
                height: 200,
                floating: true,
                hidden: true,
                listeners: {
                    scope: me,
                    cancelclick: me.collapse,
                    okclick: me.onMonthSelect,
                    yeardblclick: me.onMonthSelect,
                    monthdblclick: me.onMonthSelect
                },
                keyNavConfig: {
                    esc: function() {
                        me.collapse();
                    }
                }
            };
            if (me.pickerOptions) {
                Ext.apply(pickerConfig, me.pickerOptions, monthPickerOptions || {});
            }
            return Ext.create('Ext.picker.Month', pickerConfig);
        }
        pickerConfig = {
            pickerField: me,
            monthPickerOptions: monthPickerOptions,
            ownerCt: me.ownerCt,
            renderTo: document.body,
            floating: true,
            hidden: true,
            focusOnShow: true,
            minDate: me.minValue,
            maxDate: me.maxValue,
            disabledDatesRE: me.disabledDatesRE,
            disabledDatesText: me.disabledDatesText,
            disabledDays: me.disabledDays,
            disabledDaysText: me.disabledDaysText,
            format: me.format,
            showToday: me.showToday,
            startDay: me.startDay,
            minText: format(me.minText, me.formatDate(me.minValue)),
            maxText: format(me.maxText, me.formatDate(me.maxValue)),
            listeners: {
                scope: me,
                select: me.onSelect
            },
            keyNavConfig: {
                esc: function() {
                    me.collapse();
                }
            }
        };
        if (me.pickerOptions) {
            Ext.apply(pickerConfig, me.pickerOptions);
        }
        pickerConfig.cls = (pickerConfig.cls || "") + " " + Ext.baseCSSPrefix + "menu";
        return Ext.create('Ext.picker.Date', pickerConfig);
    },
    onMonthSelect: function(picker, value) {
        var me = this;
        var me = this,
            month = value[0],
            year = value[1],
            date = new Date(year, month, 1);
        if (date.getMonth() !== month) {
            date = new Date(year, month, 1).getLastDateOfMonth();
        }
        me.setValue(date);
        me.fireEvent('select', me, date);
        me.collapse();
    }
});

Ext.form.field.Display.override({
    fieldSubTpl: ['<div id="{id}" role="input" class="{fieldCls}" <tpl if="fieldStyle"> style="{fieldStyle}"</tpl>>{value}</div>', {
        compiled: true,
        disableFormats: true
    }],
    initComponent: function() {
        if (!this.value && this.html) {
            this.value = this.html;
        }
        this.callParent(arguments);
    },
    getDisplayValue: function() {
        var me = this,
            value = this.getRawValue(),
            display;
        if (Ext.isEmpty(value) && !Ext.isEmpty(me.emptyText)) {
            display = me.emptyText;
        } else if (me.format) {
            display = Ext.net.StringUtils.format(me.format, value);
        } else if (me.renderer) {
            display = me.renderer.call(me.scope || me, value, me);
        } else {
            display = me.htmlEncode ? Ext.util.Format.htmlEncode(value) : value;
        }
        return display;
    },
    appendLine: function(text) {
        this.append(text + "<br/>");
    }
});

Ext.util.Format.timeSettings = {
    pastPrefix: null,
    futurePrefix: null,
    pastSuffix: "ago",
    futureSuffix: "from now",
    seconds: "less than a minute",
    minute: "about a minute",
    minutes: "{0} minutes",
    hour: "about an hour",
    hours: "about {0} hours",
    day: "a day",
    days: "{0} days",
    month: "about a month",
    months: "{0} months",
    year: "about a year",
    years: "{0} years",
    ranges: [{
        value: 0,
        unit: "second"
    }, {
        value: 45,
        unit: "second",
        setting: "seconds"
    }, {
        value: 90,
        unit: "second",
        setting: "minute"
    }, {
        value: 45,
        unit: "minute",
        setting: "minutes"
    }, {
        value: 90,
        unit: "minute",
        setting: "hour"
    }, {
        value: 24,
        unit: "hour",
        setting: "hours"
    }, {
        value: 42,
        unit: "hour",
        setting: "day"
    }, {
        value: 30,
        unit: "day",
        setting: "days"
    }, {
        value: 45,
        unit: "day",
        setting: "month"
    }, {
        value: 365,
        unit: "day",
        setting: "months",
        divider: 30
    }, {
        value: 1.5,
        unit: "year",
        setting: "year"
    }, {
        value: Number.POSITIVE_INFINITY,
        unit: "year",
        setting: "years"
    }, ]
};
Ext.util.Format.time = function(value) {
    if (!value) {
        return null;
    }
    if (!Ext.isDate(value)) {
        value = Ext.Date.parse(value, "c");
        if (!value) {
            value = Ext.Date.parse(value, "MS");
        }
        if (!value) {
            value = Ext.Date.parse(value, "time");
        }
    }
    if (!value) {
        return null;
    }
    var diff = new Date().getTime() - value.getTime(),
        absDiff = Math.abs(diff),
        settings = Ext.util.Format.timeSettings,
        prefix = diff < 0 ? settings.futurePrefix : settings.pastPrefix,
        suffix = diff < 0 ? settings.futureSuffix : settings.pastSuffix,
        multiplier = {
            second: 1000,
            minute: 60000,
            hour: 3600000,
            day: 86400000,
            year: 31536000000
        },
        times = {
            second: absDiff / 1000,
            minute: absDiff / 60000,
            hour: absDiff / 3600000,
            day: absDiff / 86400000,
            year: absDiff / 31536000000
        },
        i, fn, range, value1, value2, ranges = settings.ranges,
        length = ranges.length;
    for (i = 0; i < length; i++) {
        range = ranges[i];
        if (i < (length - 1)) {
            value1 = range.value * multiplier[range.unit];
            value2 = ranges[i + 1].value * multiplier[ranges[i + 1].unit];
            if (absDiff >= value1 && absDiff < value2) {
                range = ranges[i + 1];
                break;
            }
        }
    }
    fn = settings[range.setting];
    value1 = Math.round(range.divider ? (times[range.unit] / range.divider) : times[range.unit]);
    value2 = Ext.String.format(Ext.isFunction(fn) ? fn(value1) : fn, value1);
    return [prefix, value2, suffix].join(" ");
};
Ext.define('Ext.form.field.DisplayTime', {
    extend: 'Ext.form.field.Display',
    alias: 'widget.displaytimefield',
    autoUpdate: false,
    updateInterval: 60000,
    constructor: function() {
        this.callParent(arguments);
        this.date = this.date;
        if (this.date) {
            this.value = Ext.util.Format.time(this.date);
        }
        this.setValue = Ext.Function.bind(this.setValue, this);
        if (this.autoUpdate) {
            this.startUpdating();
        }
    },
    startUpdating: function(interval) {
        if (interval) {
            this.updateInterval = interval;
        }
        this.autoUpdate = true;
        this.timer = setInterval(this.setValue, this.updateInterval);
    },
    stopUpdating: function() {
        this.autoUpdate = false;
        if (this.timer) {
            clearInterval(this.timer);
            delete this.timer;
        }
    },
    setValue: function(date) {
        if (date) {
            this.date = date;
        }
        this.callParent([this.date ? Ext.util.Format.time(this.date) : ""]);
    }
});

Ext.form.Panel.override({
    initComponent: function() {
        this.callParent(arguments);
        this.addEvents("fieldchange");
    },
    validate: function() {
        return this.getForm().isValid();
    },
    getName: function() {
        return this.id || '';
    },
    clearInvalid: function() {
        return this.getForm().clearInvalid();
    },
    markInvalid: function(msg) {
        return this.getForm().markInvalid(msg);
    },
    getValue: function() {
        return this.getForm().getValues();
    },
    setValue: function(value) {
        return this.getForm().setValues(value);
    },
    reset: function() {
        return this.getForm().reset();
    }
});

Ext.form.field.Hidden.override({
    hidden: true,
    autoEl: {
        tag: "input",
        type: "hidden"
    },
    getElConfig: function() {
        return Ext.apply(this.callParent(), {
            id: this.id,
            name: this.name || this.getInputId(),
            cls: Ext.baseCSSPrefix + 'form-hidden'
        });
    },
    afterRender: function() {
        this.inputEl = this.el;
        this.labelEl = this.el;
        this.bodyEl = this.el;
        this.errorEl = this.el;
        this.inputRow = this.el;
        if (Ext.isDefined(this.value)) {
            this.originalValue = this.lastValue = this.value;
            this.el.dom.value = this.value;
        }
        this.callParent();
    },
    renderActiveError: Ext.emptyFn,
    updateLayout: Ext.emptyFn
});

Ext.form.field.HtmlEditor.override({
    escapeValue: true,
    componentTpl: ['{beforeTextAreaTpl}', '<textarea id="{id}-textareaEl" name="{name}" tabIndex="-1" {inputAttrTpl}', ' class="{textareaCls}" autocomplete="off">', '{[escape(values.value)]}', '</textarea>', '{afterTextAreaTpl}', '{beforeIFrameTpl}', '<iframe id="{id}-iframeEl" name="{iframeName}" frameBorder="0" {iframeAttrTpl}', ' src="{iframeSrc}" class="{iframeCls}"></iframe>', '{afterIFrameTpl}', {
        disableFormats: true
    }],
    initComponent: function() {
        if (this.initialConfig && this.initialConfig.buttonTips) {
            this.buttonTips = Ext.Object.merge(Ext.clone(Ext.form.field.HtmlEditor.prototype.buttonTips), this.buttonTips);
        }
        if (!this.name) {
            this.name = this.id || this.inputId || Ext.id();
        }
        this.callParent(arguments);
    },
    syncValue: function() {
        var me = this,
            body, changed, html, bodyStyle, match, textElDom;
        if (me.initialized) {
            body = me.getEditorBody();
            html = body.innerHTML;
            textElDom = me.textareaEl.dom;
            if (Ext.isWebKit) {
                bodyStyle = body.getAttribute('style');
                match = bodyStyle.match(/text-align:(.*?);/i);
                if (match && match[1]) {
                    html = '<div style="' + match[0] + '">' + html + '</div>';
                }
            }
            html = me.cleanHtml(html);
            if (me.fireEvent('beforesync', me, html) !== false) {
                if (Ext.isGecko && textElDom.value === '' && html === '<br>') {
                    html = '';
                }
                if (textElDom.value !== html) {
                    textElDom.value = this.escapeValue ? escape(html) : html;
                    changed = true;
                }
                me.fireEvent('sync', me, html);
                if (changed && !me.inSync) {
                    me.inSync = true;
                    me.checkChange();
                    delete me.isSync;
                }
            }
        }
    },
    setValue: function(value) {
        var me = this,
            textarea = me.textareaEl,
            inputCmp = me.inputCmp;
        me.mixins.field.setValue.call(me, value);
        if (value === null || value === undefined) {
            value = '';
        }
        if (textarea) {
            textarea.dom.value = this.escapeValue ? escape(value) : value;
        }
        me.pushValue();
        if (!me.rendered && me.inputCmp) {
            me.inputCmp.data.value = value;
        }
        return me;
    },
    getValue: function() {
        var me = this,
            value;
        if (!me.sourceEditMode) {
            me.syncValue();
        }
        value = me.rendered ? me.textareaEl.dom.value : me.value;
        me.value = value;
        return this.escapeValue ? unescape(value) : value;
    },
    toggleSourceEdit: function(sourceEditMode) {
        var me = this,
            iframe = me.iframeEl,
            textarea = me.textareaEl,
            hiddenCls = Ext.baseCSSPrefix + 'hidden',
            btn = me.getToolbar().getComponent('sourceedit');
        if (!Ext.isBoolean(sourceEditMode)) {
            sourceEditMode = !me.sourceEditMode;
        }
        me.sourceEditMode = sourceEditMode;
        if (btn.pressed !== sourceEditMode) {
            btn.toggle(sourceEditMode);
        }
        if (sourceEditMode) {
            me.disableItems(true);
            me.syncValue();
            if (this.escapeValue) {
                textarea.dom.value = unescape(this.textareaEl.dom.value);
            }
            iframe.addCls(hiddenCls);
            textarea.removeCls(hiddenCls);
            textarea.dom.removeAttribute('tabIndex');
            textarea.focus();
            me.inputEl = textarea;
        } else {
            if (me.initialized) {
                me.disableItems(me.readOnly);
            }
            me.pushValue();
            if (this.escapeValue) {
                textarea.dom.value = escape(this.textareaEl.dom.value);
            }
            iframe.removeCls(hiddenCls);
            textarea.addCls(hiddenCls);
            textarea.dom.setAttribute('tabIndex', -1);
            me.deferFocus();
            me.inputEl = iframe;
        }
        me.fireEvent('editmodechange', me, sourceEditMode);
        me.doComponentLayout();
    },
    pushValue: function() {
        var me = this,
            v;
        if (me.initialized) {
            v = (me.escapeValue ? unescape(me.textareaEl.dom.value) : me.textareaEl.dom.value) || "";
            if (!me.activated && v.length < 1) {
                v = me.defaultValue;
            }
            if (me.fireEvent('beforepush', me, v) !== false) {
                me.getEditorBody().innerHTML = v;
                if (Ext.isGecko) {
                    me.setDesignMode(false);
                    me.setDesignMode(true);
                }
                me.fireEvent('push', me, v);
            }
        }
    },
    onEditorEvent: function() {
        if (Ext.isIE && !Ext.isIE11) {
            this.currentRange = this.getDoc().selection.createRange();
        }
        this.updateToolbar();
    },
    insertAtCursor: function(text) {
        var doc, r, nnode;
        if (!this.activated) {
            return;
        }
        this.win.focus();
        if (Ext.isIE && !Ext.isIE11) {
            doc = this.getDoc();
            r = this.currentRange || doc.selection.createRange();
            if (r) {
                r.pasteHTML(text);
                this.syncValue();
                this.deferFocus();
            }
        } else if (Ext.isIE11) {
            doc = this.getDoc();
            r = doc.getSelection().getRangeAt(0);
            nnode = doc.createElement("span");
            r.surroundContents(nnode);
            nnode.innerHTML = text;
        } else {
            this.execCmd("InsertHTML", text);
            this.deferFocus();
        }
    },
    append: function(text, appendLine) {
        this.setValue([this.getValue(), text, appendLine === true ? "<br/>" : ""].join(""), false);
    },
    appendLine: function(text) {
        this.append(text, true);
    }
});
Ext.form.field.HtmlEditor.override({
    fixKeys: (function() {
        if (Ext.isIE && !Ext.isIE11) {
            return function(e) {
                var me = this,
                    k = e.getKey(),
                    doc = me.getDoc(),
                    readOnly = me.readOnly,
                    range, target;
                if (k === e.TAB) {
                    e.stopEvent();
                    if (!readOnly) {
                        range = doc.selection.createRange();
                        if (range) {
                            if (range.collapse) {
                                range.collapse(true);
                                range.pasteHTML('&#160;&#160;&#160;&#160;');
                            }
                            me.deferFocus();
                        }
                    }
                }
            };
        }
        if (Ext.isOpera) {
            return function(e) {
                var me = this,
                    k = e.getKey(),
                    readOnly = me.readOnly;
                if (k === e.TAB) {
                    e.stopEvent();
                    if (!readOnly) {
                        me.win.focus();
                        me.execCmd('InsertHTML', '&#160;&#160;&#160;&#160;');
                        me.deferFocus();
                    }
                }
            };
        }
        return null;
    }())
});

Ext.define("Ext.net.Label", {
    extend: "Ext.form.Label",
    alias: 'widget.netlabel',
    requires: ['Ext.XTemplate'],
    iconAlign: "left",
    baseCls: Ext.baseCSSPrefix + "label",
    renderTpl: ['<tpl if="iconAlign == \'left\'">', '<img src="{[Ext.BLANK_IMAGE_URL]}" class="' + Ext.baseCSSPrefix + 'label-icon', '<tpl if="!Ext.isEmpty(iconCls)"> {iconCls}</tpl>', '"/>', '</tpl>', '<span class="' + Ext.baseCSSPrefix + 'label-value">', '<tpl if="!Ext.isEmpty(html)">{html}</tpl>', '</span>', '<tpl if="iconAlign == \'right\'">', '<img src="{[Ext.BLANK_IMAGE_URL]}" class="' + Ext.baseCSSPrefix + 'label-icon', '<tpl if="!Ext.isEmpty(iconCls)"> {iconCls}</tpl>', '"/>', '</tpl>', ],
    getElConfig: function() {
        var me = this;
        return Ext.apply(me.callParent(), {
            tag: 'label',
            id: me.id,
            htmlFor: me.forId || ''
        });
    },
    beforeRender: function() {
        var me = this;
        me.callParent();
        Ext.apply(me.renderData, {
            iconAlign: me.iconAlign,
            iconCls: me.iconCls || "",
            html: this.getDisplayText(me.text ? me.text : me.html, !!me.text)
        });
        Ext.apply(me.renderSelectors, {
            imgEl: '.' + Ext.baseCSSPrefix + 'label-icon',
            textEl: '.' + Ext.baseCSSPrefix + 'label-value'
        });
        delete me.html;
    },
    afterRender: function() {
        Ext.net.Label.superclass.afterRender.call(this);
        if (Ext.isEmpty(this.iconCls)) {
            this.imgEl.setDisplayed(false);
        }
        if (this.editor) {
            if (Ext.isEmpty(this.editor.field)) {
                this.editor.field = {
                    xtype: "textfield"
                };
            }
            this.editor.target = this.textEl;
            this.editor = new Ext.Editor(this.editor);
        }
    },
    getContentTarget: function() {
        return this.textEl;
    },
    getText: function(encode) {
        return this.rendered ? encode === true ? Ext.util.Format.htmlEncode(this.textEl.dom.innerHTML) : this.textEl.dom.innerHTML : this.text;
    },
    getDisplayText: function(text, encode) {
        var t = text || this.text || this.html || "",
            x = encode !== false ? Ext.util.Format.htmlEncode(t) : t;
        return (Ext.isEmpty(t) && !Ext.isEmpty(this.emptyText)) ? this.emptyText : !Ext.isEmpty(this.format) ? Ext.net.StringUtils.format(this.format, x) : x
    },
    setText: function(text, encode) {
        encode = encode !== false;
        if (encode) {
            this.text = text;
            delete this.html;
        } else {
            this.html = text;
            delete this.text;
        }
        if (this.rendered) {
            this.textEl.dom.innerHTML = this.getDisplayText(null, encode);
            this.updateLayout();
        }
        return this;
    },
    setIconCls: function(cls) {
        var oldCls = this.iconCls;
        cls = cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls;
        this.iconCls = cls;
        if (this.rendered) {
            this.imgEl.replaceCls(oldCls, this.iconCls);
            this.imgEl.setDisplayed(!Ext.isEmpty(cls));
        }
    },
    append: function(text, appendLine) {
        this.setText([this.getText(), text, appendLine === true ? "<br/>" : ""].join(""), false);
    },
    appendLine: function(text) {
        this.append(text, true);
    }
});

Ext.define("Ext.net.HyperLink", {
    extend: "Ext.net.Label",
    alias: 'widget.nethyperlink',
    url: "#",
    renderTpl: ['<tpl if="iconAlign == \'left\'">', '<img src="{[Ext.BLANK_IMAGE_URL]}" class="' + Ext.baseCSSPrefix + 'label-icon', '<tpl if="!Ext.isEmpty(iconCls)"> {iconCls}</tpl>', '"/>', '</tpl>', '<a style="vertical-align:middle;"', '<tpl if="!Ext.isEmpty(hrefCls)"> class="{hrefCls}"</tpl>', '<tpl if="!Ext.isEmpty(href)"> href="{href}"</tpl>', '>', '</a>', '<tpl if="iconAlign == \'right\'">', '<img src="{[Ext.BLANK_IMAGE_URL]}" class="' + Ext.baseCSSPrefix + 'label-icon', '<tpl if="!Ext.isEmpty(iconCls)"> {iconCls}</tpl>', '"/>', '</tpl>', ],
    getElConfig: function() {
        var me = this;
        return Ext.apply(me.callParent(), {
            tag: 'span',
            id: me.id
        });
    },
    beforeRender: function() {
        var me = this;
        me.callParent();
        Ext.apply(me.renderData, {
            iconAlign: me.iconAlign,
            iconCls: me.iconCls || "",
            hrefCls: this.hrefCls,
            href: this.url
        });
        Ext.apply(me.renderSelectors, {
            imgEl: '.' + Ext.baseCSSPrefix + 'label-icon',
            textEl: 'a'
        });
    },
    afterRender: function() {
        Ext.net.HyperLink.superclass.afterRender.call(this);
        if (this.disabled) {
            this.textEl.set({
                "disabled": "1",
                "href": ""
            });
        }
        if (!Ext.isEmpty(this.target, false)) {
            this.textEl.set({
                "target": this.target
            });
        }
        if (this.imageUrl) {
            this.textEl.update('<img src="' + this.imageUrl + '" />');
        } else {
            this.textEl.update(this.text ? Ext.util.Format.htmlEncode(this.text) : (this.html || ""));
        }
    },
    setDisabled: function(disabled) {
        Ext.net.HyperLink.superclass.setDisabled.apply(this, arguments);
        if (disabled) {
            this.textEl.set({
                "disabled": "1"
            });
            this.textEl.dom.removeAttribute("href");
        } else {
            this.textEl.set({
                "href": this.url
            });
            this.textEl.dom.removeAttribute("disabled");
        }
    },
    setImageUrl: function(imageUrl) {
        this.imageUrl = imageUrl;
        this.textEl.update('<img style="border:0px;" src="' + this.imageUrl + '" />');
    },
    setUrl: function(url) {
        this.url = url;
        this.textEl.set({
            "href": this.url
        });
    },
    setTarget: function(target) {
        this.target = target;
        this.textEl.set({
            "target": this.target
        });
    }
});

Ext.define("Ext.layout.component.Image", {
    extend: "Ext.layout.component.Auto",
    alias: ["layout.image"],
    type: 'image',
    publishInnerHeight: function(ownerContext, height) {
        var padding = this.owner.el.getPadding("tb") || 0,
            border = this.owner.el.getBorderWidth("tb") || 0;
        if (this.owner.allowPan || this.owner.resizable) {
            this.owner.el.setHeight(height);
            if (!this.owner.allowPan) {
                this.owner.imgEl.setHeight(height - padding - border);
            }
        } else {
            this.owner.imgEl.setHeight(height - padding - border);
        }
    },
    publishInnerWidth: function(ownerContext, width) {
        var padding = this.owner.el.getPadding("lr") || 0,
            border = this.owner.el.getBorderWidth("lr") || 0;
        if (this.owner.allowPan || this.owner.resizable) {
            this.owner.el.setWidth(width);
            if (!this.owner.allowPan) {
                this.owner.imgEl.setWidth(width - padding - border);
            }
        } else {
            this.owner.imgEl.setWidth(width - padding - border);
        }
    }
});
Ext.define("Ext.net.Image", {
    extend: "Ext.Component",
    alias: "widget.netimage",
    lazyLoad: false,
    monitorComplete: true,
    monitorPoll: 200,
    allowPan: false,
    componentLayout: "image",
    initComponent: function() {
        Ext.net.Image.superclass.initComponent.call(this);
        this.addEvents("resizerbeforeresize", "resizerresize", "pan", "click", "dblclick", "complete", "beforeload");
        this.imageProxy = new Image();
        if (this.monitorComplete) {
            if (this.loadMask) {
                this.loadMask = Ext.apply({
                    msg: Ext.view.AbstractView.prototype.loadingText,
                    msgCls: "x-mask-msg"
                }, this.loadMask);
                this.on("beforeload", function() {
                    if (this.rendered) {
                        this.getMaskEl().mask(this.loadMask.msg, this.loadMask.msgCls);
                    } else {
                        this.loadMask.deferredMask = true;
                    }
                });
                this.on("complete", function() {
                    if (this.rendered) {
                        this.getMaskEl().unmask(this.loadMask.removeMask);
                    } else {
                        this.loadMask.deferredMask = false;
                    }
                }, this);
            }
            this.checkTask = new Ext.util.DelayedTask(function() {
                if (this.imageProxy.complete) {
                    this.checkTask.cancel();
                    this.complete = true;
                    if (this.allowPan && this.rendered) {
                        if (this.xDelta || this.yDelta) {
                            this.el.dom.scrollLeft -= this.xDelta || 0;
                            this.el.dom.scrollTop -= this.yDelta || 0;
                        }
                    }
                    this.fireEvent("complete", this);
                } else {
                    this.checkTask.delay(this.monitorPoll);
                }
            }, this);
            if (!this.lazyLoad) {
                this.imageProxy.src = this.imageUrl;
                this.fireEvent("beforeload", this);
                this.checkTask.delay(this.monitorPoll);
            }
        }
    },
    getMaskEl: function() {
        return this.el;
    },
    getOriginalSize: function() {
        return {
            width: this.imageProxy.width,
            height: this.imageProxy.height
        };
    },
    beforeRender: function() {
        var me = this;
        me.callParent();
        if (this.lazyLoad) {
            this.imageProxy.src = this.imageUrl;
            if (this.monitorComplete) {
                this.fireEvent("beforeload", this);
                this.checkTask.delay(this.monitorPoll);
            }
        }
        this.renderTpl = ['<img src="{src}" style="border:none;"', '<tpl if="!Ext.isEmpty(altText)"> alt="{altText}"</tpl>', '<tpl if="!Ext.isEmpty(align)"> align="{align}"</tpl>', '<tpl if="!Ext.isEmpty(cls)"> class="{cls}"</tpl>', '/>', ];
        this.renderData = {
            altText: this.altText,
            align: this.align !== "notset" ? this.align : null,
            cls: this.cls,
            src: this.imageUrl
        };
        Ext.apply(this.renderSelectors, {
            imgEl: 'img'
        });
    },
    initResizable: Ext.emptyFn,
    afterRender: function() {
        Ext.net.Image.superclass.afterRender.apply(this);
        this.imgEl.on("click", this.onClick, this);
        this.imgEl.on("dblclick", this.onDblClick, this);
        if (this.allowPan) {
            this.el.dom.style.overflow = "hidden";
            this.imgEl.on("mousedown", this.onMouseDown, this);
            this.imgEl.setStyle("cursor", "move");
            if (this.xDelta || this.yDelta) {
                this.el.dom.scrollLeft -= this.xDelta || 0;
                this.el.dom.scrollTop -= this.yDelta || 0;
            }
        }
        if (this.resizable) {
            this.resizer = Ext.create("Ext.resizer.Resizer", Ext.applyIf(this.resizable || {}, {
                target: this,
                handles: "all"
            }));
            this.resizer.on("beforeresize", function(r, e) {
                return this.fireEvent("resizerbeforeresize", this, e);
            }, this);
            this.resizer.on("resize", function(r, width, height, e) {
                if (!this.allowPan) {
                    this.imgEl.setSize(width, height);
                }
                this.fireEvent("resizerresize", this, width, height, e);
            }, this);
        }
    },
    afterComponentLayout: function() {
        this.callParent(arguments);
        if (this.loadMask && this.loadMask.deferredMask) {
            this.getMaskEl().mask(this.loadMask.msg, this.loadMask.msgCls);
            delete this.loadMask.deferredMask;
        }
    },
    onClick: function(e, t) {
        this.fireEvent("click", this, e, t);
    },
    onDblClick: function(e, t) {
        this.fireEvent("dblclick", this, e, t);
    },
    onMouseDown: function(e) {
        e.stopEvent();
        this.mouseX = e.getPageX();
        this.mouseY = e.getPageY();
        Ext.getBody().on("mousemove", this.onMouseMove, this);
        Ext.getDoc().on("mouseup", this.onMouseUp, this);
    },
    onMouseMove: function(e) {
        e.stopEvent();
        var x = e.getPageX(),
            y = e.getPageY();
        if (e.within(this.el)) {
            var xDelta = x - this.mouseX;
            var yDelta = y - this.mouseY;
            this.el.dom.scrollLeft -= xDelta;
            this.el.dom.scrollTop -= yDelta;
            this.fireEvent("pan", this, this.el.dom.scrollLeft, this.el.dom.scrollTop, xDelta, yDelta);
        }
        this.mouseX = x;
        this.mouseY = y;
    },
    onMouseUp: function(e) {
        Ext.getBody().un("mousemove", this.onMouseMove, this);
        Ext.getDoc().un("mouseup", this.onMouseUp, this);
    },
    getContentTarget: function() {
        return this.imgEl;
    },
    setImageUrl: function(imageUrl) {
        this.imageUrl = imageUrl;
        if (this.rendered) {
            this.imgEl.dom.removeAttribute("width");
            this.imgEl.dom.removeAttribute("height");
            this.imgEl.dom.src = this.imageUrl;
            if (this.monitorComplete) {
                delete this.imageProxy;
                this.imageProxy = new Image();
                this.imageProxy.src = this.imageUrl;
                this.fireEvent("beforeload", this);
                this.checkTask.cancel();
                this.checkTask.delay(this.monitorPoll);
            }
        } else {
            if (!this.lazyLoad) {
                delete this.imageProxy;
                this.imageProxy = new Image();
                this.imageProxy.src = this.imageUrl;
                if (this.monitorComplete) {
                    this.fireEvent("beforeload", this);
                    this.checkTask.cancel();
                    this.checkTask.delay(this.monitorPoll);
                }
            }
        }
    },
    setAlign: function(align) {
        this.align = align;
        if (this.rendered) {
            this.imgEl.dom.setAttribute("align", this.align);
        }
    },
    setAltText: function(altText) {
        this.altText = altText;
        if (this.rendered) {
            this.imgEl.dom.setAttribute("altText", this.altText);
        }
    },
    scroll: function(x, y) {
        if (x) {
            this.el.dom.scrollLeft -= x;
        }
        if (y) {
            this.el.dom.scrollTop -= y;
        }
    },
    scrollTo: function(x, y) {
        if (x || x === 0) {
            this.el.dom.scrollLeft = x;
        }
        if (y || y === 0) {
            this.el.dom.scrollTop = y;
        }
    },
    getCurrentScroll: function() {
        return {
            x: this.el.dom.scrollLef,
            y: this.el.dom.scrollTop
        };
    }
});

Ext.form.NumberField.prototype.setValue = Ext.Function.createSequence(Ext.form.NumberField.prototype.setValue, function(v) {
    if (this.trimTrailedZeros === false) {
        var value = this.getValue(),
            strValue;
        if (!Ext.isEmpty(value, false)) {
            strValue = value.toFixed(this.decimalPrecision).replace(".", this.decimalSeparator);
            this.setRawValue(strValue);
        }
    }
});

Ext.override(Ext.form.TextArea, {
    initComponent: function() {
        Ext.form.TextArea.superclass.initComponent.call(this);
        if (this.maxLength !== Number.MAX_VALUE && this.truncate === true) {
            this.on("validitychange", function(f, isValid) {
                if (!isValid && this.getValue().length > this.maxLength) {
                    this.setValue(this.getValue().substr(0, this.maxLength));
                }
            });
        }
    },
    appendLine: function(text) {
        this.append(text + "\n");
    }
});

Ext.form.field.Time.override({
    useHiddenField: true,
    processHiddenValue: function() {
        return this.getRawValue();
    }
});

Ext.define("Ext.net.MultiCombo", {
    extend: "Ext.form.field.ComboBox",
    alias: "widget.netmulticombo",
    wrapBySquareBrackets: false,
    selectionMode: "checkbox",
    multiSelect: true,
    sortByDisplayField: false,
    sortByValueField: false,
    assertValue: function() {
        this.collapse();
    },
    getPicker: function() {
        if (!this.picker) {
            this.listConfig = this.listConfig || {};
            if (!this.listConfig.getInnerTpl) {
                this.listConfig.getInnerTpl = function(displayField) {
                    return '<div class="x-combo-list-item {[this.getItemClass(values)]}">' + '<div class="x-mcombo-text">{' + displayField + '}</div></div>';
                };
            }
            this.listConfig.selModel = {
                mode: 'SIMPLE'
            };
            this.picker = this.createPicker();
            this.mon(this.picker.getSelectionModel(), 'select', this.onListSelect, this);
            this.mon(this.picker.getSelectionModel(), 'deselect', this.onListDeselect, this);
            this.picker.tpl.getItemClass = Ext.Function.bind(function(values) {
                var record, searchValue, selected;
                if (this.selectionMode === "selection") {
                    return "";
                }
                Ext.each(this.store.getRange(), function(r) {
                    if (r.get(this.valueField) == values[this.valueField]) {
                        record = r;
                        return false;
                    }
                }, this);
                selected = record ? this.picker.getSelectionModel().isSelected(record) : false;
                if (selected) {
                    return "x-mcombo-item-checked";
                }
                return "x-mcombo-item-unchecked";
            }, this, [], true);
            if (this.selectionMode !== "checkbox") {
                this.picker.on("render", function() {
                    this.picker.overItemCls = "x-multi-selected";
                }, this);
            }
            this.picker.on("viewready", this.onViewReady, this, {
                single: true
            });
        }
        return this.picker;
    },
    onViewReady: function() {
        Ext.each(this.valueModels, function(r) {
            this.selectRecord(r);
        }, this);
    },
    onListSelect: function(model, record) {
        if (!this.ignoreSelection) {
            this.selectRecord(record);
        }
    },
    onListDeselect: function(model, record) {
        if (!this.ignoreSelection) {
            this.deselectRecord(record);
        }
    },
    initComponent: function() {
        this.editable = false;
        this.callParent(arguments);
    },
    getDisplayValue: function() {
        var value = this.displayTpl.apply(this.displayTplData);
        return this.wrapBySquareBrackets ? "[" + value + "]" : value;
    },
    isSelected: function(record) {
        if (Ext.isNumber(record)) {
            record = this.store.getAt(record);
        }
        if (Ext.isString(record)) {
            Ext.each(this.store.getRange(), function(r) {
                if (r.get(this.valueField) == record) {
                    record = r;
                    return false;
                }
            }, this);
        }
        return Ext.Array.indexOf(this.valueModels, record) !== -1;
    },
    deselectRecord: function(record) {
        if (!this.picker) {
            return;
        }
        switch (this.selectionMode) {
            case "checkbox":
                this.picker.refreshNode(this.store.indexOf(record));
                break;
            case "selection":
                if (this.picker.getSelectionModel().isSelected(record)) {
                    this.picker.deselect(this.store.indexOf(record));
                }
                break;
            case "all":
                if (this.picker.getSelectionModel().isSelected(record)) {
                    this.picker.deselect(this.store.indexOf(record));
                }
                this.picker.refreshNode(this.store.indexOf(record));
                break;
        }
    },
    selectRecord: function(record) {
        if (!this.picker) {
            return;
        }
        switch (this.selectionMode) {
            case "checkbox":
                this.picker.refreshNode(this.store.indexOf(record));
                break;
            case "selection":
                if (!this.picker.getSelectionModel().isSelected(record)) {
                    this.picker.select(this.store.indexOf(record), true);
                }
                break;
            case "all":
                if (!this.picker.getSelectionModel().isSelected(record)) {
                    this.picker.select(this.store.indexOf(record), true);
                }
                this.picker.refreshNode(this.store.indexOf(record));
                break;
        }
    },
    selectAll: function() {
        this.setValue(this.store.getRange());
    },
    deselectItem: function(record) {
        if (Ext.isNumber(record)) {
            record = this.store.getAt(record);
        }
        if (Ext.isString(record)) {
            Ext.each(this.store.getRange(), function(r) {
                if (r.get(this.valueField) == record) {
                    record = r;
                    return false;
                }
            }, this);
        }
        if (Ext.Array.indexOf(this.valueModels, record) !== -1) {
            this.setValue(Ext.Array.remove(this.valueModels, record));
            this.deselectRecord(record);
        }
    },
    selectItem: function(record) {
        if (Ext.isNumber(record)) {
            record = this.store.getAt(record);
        }
        if (Ext.isString(record)) {
            Ext.each(this.store.getRange(), function(r) {
                if (r.get(this.valueField) == record) {
                    record = r;
                    return false;
                }
            }, this);
        }
        if (Ext.Array.indexOf(this.valueModels, record) === -1) {
            this.valueModels.push(record);
            this.setValue(this.valueModels);
        }
    },
    getSelectedRecords: function() {
        return this.valueModels;
    },
    getSelectedIndexes: function() {
        var indexes = [];
        Ext.each(this.valueModels, function(record) {
            indexes.push(this.store.indexOf(record));
        }, this);
        return indexes;
    },
    getSelectedValues: function() {
        var values = [];
        Ext.each(this.valueModels, function(record) {
            values.push(record.get(this.valueField));
        }, this);
        return values;
    },
    getSelectedText: function() {
        var text = [];
        Ext.each(this.valueModels, function(record) {
            text.push(record.get(this.displayField));
        }, this);
        return text;
    },
    getSelection: function() {
        var selection = [];
        Ext.each(this.valueModels, function(record) {
            selection.push({
                text: record.get(this.displayField),
                value: record.get(this.valueField),
                index: this.store.indexOf(record)
            });
        }, this);
        return selection;
    },
    setValue: function(value, doSelect) {
        var me = this,
            matchedRecords, nonRecords, fieldToSortBy, record;
        if (me.sortByDisplayField || me.sortByValueField) {
            value = Ext.Array.from(value);
            matchedRecords = [];
            nonRecords = [];
            fieldToSortBy = me.sortByDisplayField ? me.displayField : me.valueField;
            Ext.each(value, function(v) {
                record = v;
                if (!record || !record.isModel) {
                    record = me.findRecordByValue(record);
                }
                if (record) {
                    matchedRecords.push(record);
                } else {
                    nonRecords.push(v);
                }
            });
            Ext.Array.sort(matchedRecords, function(r1, r2) {
                var v1 = r1.get(fieldToSortBy),
                    v2 = r2.get(fieldToSortBy);
                if (v1 === v2) {
                    return 0;
                }
                return v1 > v2 ? 1 : -1;
            });
            value = matchedRecords.concat(nonRecords);
        }
        me.callParent(arguments);
        Ext.each(this.valueModels, function(r) {
            this.selectRecord(r);
        }, this);
    },
    reset: function() {
        this.callParent(arguments);
        if (this.picker && this.picker.rendered) {
            this.picker.refresh();
        }
    },
    clearValue: function() {
        this.callParent(arguments);
        if (this.picker && this.picker.rendered) {
            this.picker.refresh();
        }
    }
});

Ext.define("Ext.net.DropDownField", {
    extend: "Ext.form.field.Picker",
    alias: "widget.netdropdown",
    mode: "text",
    includeHiddenStateToSubmitData: false,
    triggerCls: Ext.baseCSSPrefix + 'form-arrow-trigger',
    syncValue: Ext.emptyFn,
    initComponent: function() {
        this.useHiddenField = this.mode !== "text";
        this.callParent();
    },
    getHiddenStateName: function() {
        return this.valueHiddenName || (this.getName() + "_value");
    },
    getHiddenState: function(value) {
        return this.getValue();
    },
    initValue: function() {
        if (!Ext.isEmpty(this.text)) {
            this.originalValue = this.lastValue = this.value;
            this.suspendCheckChange++;
            this.setValue(this.value ? this.value : (this.mode === "text" ? this.text : ""), this.text, false);
            this.suspendCheckChange--;
        } else {
            this.callParent();
        }
        this.originalText = this.getText();
    },
    collapseIf: function(e) {
        var me = this;
        if (this.allowBlur !== true && !me.isDestroyed && !e.within(me.bodyEl, false, true) && !e.within(me.picker.el, false, true)) {
            me.collapse();
        }
    },
    initEvents: function() {
        this.callParent(arguments);
        this.keyNav.map.addBinding({
            scope: this,
            key: Ext.util.KeyNav.keyOptions["tab"],
            handler: Ext.Function.bind(this.keyNav.handleEvent, this, [function(e) {
                this.collapse();
                return true;
            }], true),
            defaultEventAction: this.keyNav.defaultEventAction
        });
    },
    createPicker: function() {
        if (this.component && !this.component.render) {
            this.component = new Ext.ComponentManager.create(Ext.apply(this.component, {
                renderTo: Ext.net.getEl(this.componentRenderTo) || Ext.net.ResourceMgr.getAspForm() || document.body,
                dropDownField: this,
                hidden: true,
                floating: true
            }), "panel");
            if (this.component.rendered) {
                this.syncValue(this.getValue(), this.getText());
            } else {
                this.mon(this.component, "afterrender", function() {
                    this.syncValue(this.getValue(), this.getText());
                }, this);
            }
        }
        return this.component;
    },
    onSyncValue: function(value, text) {
        if (this.component && this.component.rendered) {
            this.syncValue(value, text);
        }
    },
    alignPicker: function() {
        var me = this,
            picker, isAbove, aboveSfx = '-above';
        if (this.isExpanded) {
            picker = me.getPicker();
            if (me.matchFieldWidth) {
                picker.setSize(me.bodyEl.getWidth());
            }
            if (picker.isFloating()) {
                picker.alignTo(me.inputEl, me.pickerAlign, me.pickerOffset);
                isAbove = picker.el.getY() < me.inputEl.getY();
                me.bodyEl[isAbove ? 'addCls' : 'removeCls'](me.openCls + aboveSfx);
                picker.el[isAbove ? 'addCls' : 'removeCls'](picker.baseCls + aboveSfx);
            }
        }
    },
    setValue: function(value, text, collapse, preventSync) {
        if (this.mode === "text") {
            collapse = text;
            text = value;
        }
        this._value = value;
        this.callParent([text]);
        if (preventSync === false || ((preventSync == null || !Ext.isDefined(preventSync)) && !this.isExpanded)) {
            this.onSyncValue(value, text);
        }
        if (collapse !== false) {
            this.collapse();
        }
        return this;
    },
    getText: function() {
        return Ext.net.DropDownField.superclass.getValue.call(this);
    },
    getValue: function() {
        return this.mode == "text" ? this.callParent() : this._value;
    },
    reset: function() {
        this.setValue(this.originalValue, this.originalText, false);
        this.clearInvalid();
        delete this.wasValid;
        this.applyEmptyText();
    },
    clearValue: function() {
        this.setValue("", "", false);
        this.clearInvalid();
        delete this.wasValid;
        this.applyEmptyText();
    },
    checkChange: function() {
        if (!this.suspendCheckChange) {
            var me = this,
                newVal = me.getValue(),
                rawValue = me.getRawValue(),
                oldVal = me.lastValue,
                oldRawVal = me.lastRawValue;
            if (!me.isEqual(newVal, oldVal) && !me.isDestroyed) {
                me.lastValue = newVal;
                me.lastRawValue = rawValue;
                me.fireEvent('change', me, newVal, oldVal);
                me.onChange(newVal, oldVal);
            } else if (!me.isEqual(rawValue, oldRawVal) && !me.isDestroyed) {
                me.lastRawValue = rawValue;
                me.fireEvent('change', me, newVal, oldVal);
                me.onChange(newVal, oldVal);
            }
        }
    }
});

Ext.form.field.File.override({
    stripPath: true,
    isIconIgnore: function() {
        return true;
    },
    onFileChange: function() {
        this.lastValue = null;
        if (this.stripPath === false) {
            Ext.form.field.File.superclass.setValue.call(this, this.button.fileInputEl.dom.value);
            return;
        }
        var v = this.button.fileInputEl.dom.value,
            fileNameRegex = /[^\\]*$/im,
            fileNameRegexNix = /[^/]*$/im,
            match = fileNameRegex.exec(v);
        if (match !== null) {
            v = match[0];
        } else {
            match = fileNameRegexNix.exec(v);
            if (match !== null) {
                v = match[0];
            }
        }
        Ext.form.field.File.superclass.setValue.call(this, v);
    },
    onEnable: function() {
        var me = this;
        me.callParent();
        me.button.fileInputEl.dom.removeAttribute("disabled");
    },
    reset: function() {
        this.callParent();
        if (this.disabled) {
            this.button.fileInputEl.dom.disabled = true;
        }
    }
});

Ext.override(Ext.menu.Menu, {
    lastTargetIn: function(cmp) {
        return Ext.fly(cmp.getEl ? cmp.getEl() : cmp).contains(this.contextEvent.t);
    },
    doAutoRender: function() {
        var me = this;
        if (!me.rendered) {
            var form = Ext.net.ResourceMgr.getAspForm(),
                ct = ((this.renderToForm !== true || !form) ? Ext.getBody() : form);
            if (me.floating) {
                me.render(ct);
            } else {
                me.render(Ext.isBoolean(me.autoRender) ? ct : me.autoRender);
            }
        }
    }
});
Ext.override(Ext.menu.Item, {
    setIconCls: function(cls) {
        this.callParent([cls && cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls]);
    },
    setIcon: function(icon) {
        if (this.iconCls) {
            this.setIconCls("");
        }
        this.callParent([icon && icon.indexOf('#') === 0 ? X.net.RM.getIconUrl(icon.substring(1)) : icon]);
    }
});

Ext.menu.CheckItem.prototype.onRender = Ext.Function.createSequence(Ext.menu.CheckItem.prototype.onRender, function(el) {
    if (this.hasId()) {
        this.getCheckedField().render(Ext.net.ResourceMgr.getAspForm() || this.el.parent() || this.el);
    }
});
Ext.menu.CheckItem.override({
    getCheckedField: function() {
        if (!this.checkedField) {
            this.checkedField = new Ext.form.Hidden({
                name: this.id
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.checkedField);
            this.on("checkchange", function(item, checked) {
                this.getCheckedField().setValue(checked);
            }, this);
        }
        return this.checkedField;
    }
});

Ext.define("Ext.net.MenuPanel", {
    extend: "Ext.panel.Panel",
    alias: "widget.netmenupanel",
    saveSelection: true,
    selectedIndex: -1,
    layout: "fit",
    initComponent: function() {
        this.menu = Ext.apply(this.menu, {
            floating: false,
            border: false
        });
        this.items = [this.menu];
        Ext.net.MenuPanel.superclass.initComponent.call(this);
        this.menu = this.items.get(0);
        this.menu.layout = {
            type: 'vbox',
            align: 'stretch',
            autoSize: false,
            clearInnerCtOnLayout: true,
            overflowHandler: 'Scroller'
        };
        if (this.selectedIndex > -1) {
            var item = this.menu.items.get(this.selectedIndex);
            if (item.rendered) {
                item.activate();
            } else {
                item.on("afterrender", item.activate, item, {
                    single: true
                });
            }
            this.getSelIndexField().setValue(this.selectedIndex);
        }
        this.menu.on("click", this.setSelection, this);
        this.menu.deactivateActiveItem = Ext.Function.bind(this.deactivateActiveItem, this);
    },
    deactivateActiveItem: function() {
        var me = this,
            menu = me.menu;
        if (menu.activeItem) {
            if (!(me.saveSelection && menu.activeItem && menu.items.indexOf(menu.activeItem) == me.selectedIndex)) {
                menu.activeItem.deactivate();
            }
            if (!menu.activeItem.activated) {
                delete menu.activeItem;
            }
        }
        if (menu.focusedItem) {
            menu.focusedItem.blur();
            if (!menu.focusedItem.$focused) {
                delete menu.focusedItem;
            }
        }
    },
    setSelectedIndex: function(index) {
        this.setSelection(this.menu, this.menu.getComponent(index));
    },
    getSelIndexField: function() {
        if (!this.selIndexField) {
            this.selIndexField = new Ext.form.Hidden({
                id: this.id + "_SelIndex",
                name: this.id + "_SelIndex"
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.selIndexField);
        }
        return this.selIndexField;
    },
    setSelection: function(menu, item, e) {
        if (this.saveSelection) {
            if (arguments.length === 1) {
                item = menu;
            }
            if (item) {
                this.clearSelection();
                this.selectedIndex = this.menu.items.indexOf(item);
                this.getSelIndexField().setValue(this.selectedIndex);
                item.activate();
            }
        }
    },
    clearSelection: function() {
        var selectedCmp;
        if (this.selectedIndex > -1) {
            selectedCmp = this.menu.getComponent(this.selectedIndex);
            if (selectedCmp) {
                selectedCmp.deactivate();
            }
        }
        this.selectedIndex = -1;
        this.getSelIndexField().setValue(null);
    },
    afterRender: function() {
        Ext.net.MenuPanel.superclass.afterRender.call(this);
        if (this.hasId()) {
            this.getSelIndexField().render(this.el.parent() || this.el);
        }
    }
});

Ext.menu.DatePicker.override({
    initComponent: function() {
        var me = this;
        Ext.apply(me, {
            showSeparator: false,
            plain: true,
            border: false,
            bodyPadding: 0,
            items: Ext.applyIf({
                cls: Ext.baseCSSPrefix + 'menu-date-item',
                xtype: 'datepicker'
            }, me.pickerConfig || me.initialConfig)
        });
        Ext.menu.DatePicker.superclass.initComponent.call(this, arguments);
        me.picker = me.down('datepicker');
        me.relayEvents(me.picker, ['select']);
        if (me.hideOnClick) {
            me.on('select', me.hidePickerOnSelect, me);
        }
    }
});

Ext.menu.ColorPicker.override({
    initComponent: function() {
        var me = this;
        Ext.apply(me, {
            plain: true,
            showSeparator: false,
            items: Ext.applyIf({
                cls: Ext.baseCSSPrefix + 'menu-color-item',
                xtype: 'colorpicker'
            }, me.pickerConfig || me.initialConfig)
        });
        Ext.menu.ColorPicker.superclass.initComponent.call(this, arguments);
        me.picker = me.down('colorpicker');
        me.relayEvents(me.picker, ['select']);
        if (me.hideOnClick) {
            me.on('select', me.hidePickerOnSelect, me);
        }
    }
});

Ext.ToolTip.override({
    setTarget: function(target) {
        var targetEl = Ext.net.getEl(target);
        if (!Ext.isEmpty(targetEl)) {
            this.setTargetEvents(targetEl);
        } else {
            var getTargetTask = new Ext.util.DelayedTask(function(task) {
                targetEl = Ext.net.getEl(target);
                if (!Ext.isEmpty(targetEl)) {
                    this.setTargetEvents(targetEl);
                    task.cancel();
                } else {
                    task.delay(500, undefined, this, [task]);
                }
            }, this);
            getTargetTask.delay(1, undefined, this, [getTargetTask]);
        }
    },
    setTargetEvents: function(targetEl) {
        if (this.target) {
            this.target = Ext.get(this.target);
            if (this.target) {
                this.mun(this.target, "mouseover", this.onTargetOver, this);
                this.mun(this.target, "mouseout", this.onTargetOut, this);
                this.mun(this.target, "mousemove", this.onMouseMove, this);
            }
        }
        this.target = targetEl;
        var t = Ext.get(this.target);
        if (t) {
            this.mon(t, {
                freezeEvent: true,
                mouseover: this.onTargetOver,
                mouseout: this.onTargetOut,
                mousemove: this.onMouseMove,
                scope: this
            });
            this.target = t;
        }
        if (this.anchor) {
            this.anchorTarget = this.target;
        }
    }
});

Ext.toolbar.Toolbar.override({
    onBeforeAdd: function(component) {
        var me = this,
            isButton = component.isButton;
        if (isButton && me.defaultButtonUI && component.ui === 'default' && !component.hasOwnProperty('ui')) {
            component.ui = me.defaultButtonUI;
        } else if ((isButton || component.isFormField) && me.ui !== 'footer' && (this.classicButtonStyle !== true && component.flat !== false)) {
            component.ui = component.ui + '-toolbar';
            if (isButton) {
                component.focusCls = "";
            }
            component.addCls(component.baseCls + '-toolbar');
        }
        if (component instanceof Ext.toolbar.Separator) {
            component.setUI((me.vertical) ? 'vertical' : 'horizontal');
        }
        Ext.toolbar.Toolbar.superclass.onBeforeAdd.call(this, arguments);
    }
});

Ext.toolbar.Paging.prototype.initComponent = Ext.Function.createSequence(Ext.toolbar.Paging.prototype.initComponent, function() {
    if (this.hideRefresh) {
        this.child("#refresh").hide();
    }
});
Ext.toolbar.Paging.override({
    bindStore: function(store, initial, propertyName) {
        var isEmpty = store === 'ext-empty-store' && initial;
        if (store && !isEmpty) {
            store = Ext.data.StoreManager.lookup(store);
        }
        if (!store || isEmpty) {
            if (this.ownerCt) {
                store = this.findStore();
            } else {
                store = 'ext-empty-store';
                this.needFindStore = true;
            }
        }
        this.callParent([store, initial, propertyName]);
    },
    findStore: function() {
        var storeOwner = this.up('{store}');
        return storeOwner ? storeOwner.store : 'ext-empty-store';
    },
    onAdded: function() {
        this.callParent(arguments);
        if (this.needFindStore) {
            this.bindStore(this.findStore());
            delete this.needFindStore;
        }
    },
    getStoreListeners: function() {
        return {
            beforeload: this.beforeLoad,
            load: this.onStoreLoad,
            exception: this.onLoadError,
            datachanged: this.onLoad,
            add: this.onLoad,
            remove: this.onLoad,
            clear: this.onClear
        };
    },
    onClear: function() {
        this.store.currentPage = 1;
        this.onLoad();
    },
    doRefresh: function() {
        var me = this,
            current = me.store.currentPage;
        if (me.fireEvent('beforechange', me, current) !== false) {
            if (me.store.isPagingStore) {
                me.store.reload();
            } else {
                me.store.loadPage(current);
            }
        }
    },
    onStoreLoad: function() {
        this.onLoad(true);
    },
    onLoad: function(isLoad) {
        var me = this,
            pageData, currPage, pageCount, afterText, total, isEmpty, item;
        if (!me.rendered) {
            if (!me.updateAfterRender) {
                me.updateAfterRender = true;
                this.on("afterrender", me.onLoad, me, {
                    single: true
                });
            }
            return;
        }
        delete me.updateAfterRender;
        pageData = me.getPageData();
        currPage = pageData.currentPage;
        total = pageData.total;
        pageCount = pageData.pageCount;
        isEmpty = pageCount === 0;
        afterText = Ext.String.format(me.afterPageText, isNaN(pageCount) ? 1 : pageCount);
        if (total === 0 || currPage > pageCount) {
            currPage = 1;
            me.store.currentPage = 1;
        }
        Ext.suspendLayouts();
        item = me.child('#afterTextItem');
        if (item) {
            item.setText(afterText);
        }
        item = me.getInputItem();
        if (item) {
            item.setDisabled(isEmpty).setValue(currPage);
        }
        me.setChildDisabled('#first', currPage === 1 || isEmpty);
        me.setChildDisabled('#prev', currPage === 1 || isEmpty);
        me.setChildDisabled('#next', currPage === pageCount || isEmpty);
        me.setChildDisabled('#last', currPage === pageCount || isEmpty);
        me.setChildDisabled('#refresh', false);
        me.updateInfo();
        Ext.resumeLayouts(true);
        if (me.rendered && isLoad === true) {
            me.fireEvent('change', me, pageData);
        }
    },
    updateInfo: function() {
        var me = this,
            displayItem = me.child('#displayItem'),
            pageData = me.getPageData(),
            msg;
        if (displayItem) {
            if (pageData.pageCount === 0) {
                msg = me.emptyMsg;
            } else {
                msg = Ext.String.format(me.displayMsg, pageData.fromRecord, pageData.toRecord, pageData.total);
            }
            displayItem.setText(msg);
        }
    }
});

Ext.toolbar.TextItem.override({
    getText: function() {
        return this.rendered ? this.el.dom.innerHTML : this.text;
    }
});

Ext.layout.container.Form.override({
    transformItemRenderTree: function(item) {
        if (item.tag && item.tag == 'table' && !item.width) {
            item.width = "100%";
        }
        var cnItem = {
            tag: 'tr',
            cn: {
                tag: 'td',
                colspan: 3,
                style: 'width:100%',
                cn: item
            }
        };
        return {
            tag: 'tbody',
            cn: Ext.isIE6 ? [cnItem, this.padRow] : cnItem
        };
    },
    getRenderTree: function() {
        var me = this,
            result = Ext.layout.container.Form.superclass.getRenderTree.apply(this, arguments),
            i, len;
        if (result) {
            for (i = 0, len = result.length; i < len; i++) {
                result[i] = me.transformItemRenderTree(result[i]);
            }
        }
        return result;
    }
});
Ext.layout.component.field.Field.override({
    finishedLayout: function(ownerContext) {
        this.callParent(arguments);
        if (this.owner.updateButtonsWidth) {
            this.owner.updateButtonsWidth();
        }
    },
    beginLayoutCycle: function(ownerContext) {
        if (this.owner.labelAlign == "top") {
            this.owner.labelEl.parent("td").setStyle("width", "100%");
            if (this.owner.hasVisibleLabel()) {
                this.owner.labelEl.parent("tr").dom.style.display = "";
            } else {
                this.owner.labelEl.parent("tr").setStyle("display", "none");
            }
        }
        if (!this.owner.indicatorEl) {
            return this.callParent(arguments);
        }
        var errorSide = this.owner.msgTarget == "side" && this.owner.hasActiveError(),
            showErrorStub = !this.owner.autoFitErrors || errorSide,
            w;
        if (!this.owner.isIndicatorActive && !this.owner.preserveIndicatorIcon) {
            this.owner.getErrorStub().setDisplayed(showErrorStub);
            this.owner.getIndicatorStub().setDisplayed(!errorSide);
            this.owner.getIndicatorStub().setStyle("width", "0px");
            this.owner.indicatorEl.parent("td").setDisplayed(!errorSide);
            this.owner.errorSideHide = errorSide;
            return this.callParent(arguments);
        }
        if (errorSide) {
            this.owner.hideIndicator(true);
            this.owner.errorSideHide = true;
            w = 0;
        } else {
            if (this.owner.errorSideHide) {
                this.owner.showIndicator(true);
            }
            w = Ext.isIE7 ? this.owner.indicatorEl.getPadding("lr") : 0;
            this.owner.indicatorEl.setStyle("padding-left", this.owner.indicatorIconCls ? "18px" : "0px");
            if (this.owner.autoFitIndicator) {
                w = (this.owner.isIndicatorEmpty() || this.owner.indicatorHidden) ? (this.owner.preserveIndicatorIcon ? 18 : 0) : (this.owner.indicatorEl.getWidth() - w);
                this.owner.indicatorEl.parent("td").setStyle("width", w + "px");
                this.owner.indicatorEl.parent().setStyle("width", w + "px");
                this.owner.indicatorEl.parent().setStyle("height", this.owner.inputEl ? (this.owner.inputEl.getHeight() + "px") : "22px");
                this.owner.indicatorEl.setStyle("width", w + "px");
            } else {
                w = this.owner.indicatorEl.getWidth() - w;
            }
        }
        this.owner.getErrorStub().setDisplayed(showErrorStub);
        this.owner.getIndicatorStub().setDisplayed(!this.owner.indicatorHidden);
        this.owner.getIndicatorStub().setStyle("width", w + "px");
        return this.callParent(arguments);
    }
});

Ext.layout.container.Accordion.override({
    onChildPanelRender: function(panel) {
        if (!this.originalHeader) {
            panel.header.addCls(Ext.baseCSSPrefix + 'accordion-hd');
        }
    },
    updatePanelClasses: function(ownerContext) {
        this.callParent(arguments);
        for (var i = 0; i < ownerContext.visibleItems.length; i++) {
            if (this.originalHeader) {
                ownerContext.visibleItems[i].header.removeCls(Ext.baseCSSPrefix + 'accordion-hd');
            }
        }
    }
});
Ext.layout.container.Accordion.prototype.beforeRenderItems = Ext.Function.createInterceptor(Ext.layout.container.Accordion.prototype.beforeRenderItems, function(items) {
    var i, len;
    for (i = 0, len = items.length; i < len; i++) {
        if (!(items[i] instanceof Ext.panel.AbstractPanel)) {
            throw Ext.String.format("The container {0} with AccordionLayout cannot have non-Panel items: {1}", this.owner.id, items[i].id);
        }
    }
});

Ext.layout.container.Column.override({
    columnWidthFlexSizePolicy: {
        readsWidth: 0,
        readsHeight: 1,
        setsWidth: 1,
        setsHeight: 1
    },
    columnFlexSizePolicy: {
        setsWidth: 0,
        setsHeight: 1
    },
    getItemSizePolicy: function(item, ownerSizeModel) {
        if (item.columnWidth) {
            if (!ownerSizeModel) {
                ownerSizeModel = this.owner.getSizeModel();
            }
            if (!ownerSizeModel.width.shrinkWrap) {
                return item.flex ? this.columnWidthFlexSizePolicy : this.columnWidthSizePolicy;
            }
        }
        return item.flex ? this.columnFlexSizePolicy : this.autoSizePolicy;
    },
    calculateHeights: function(ownerContext) {
        var me = this,
            items = ownerContext.childItems,
            len = items.length,
            blocked, i, itemContext, ownerHeight = ownerContext.target.getHeight() - ownerContext.targetContext.getPaddingInfo().height;
        blocked = false;
        for (i = 0; i < len; ++i) {
            itemContext = items[i];
            if (itemContext.target.flex) {
                itemContext.setHeight(ownerHeight);
            }
            if (!itemContext.hasDomProp('height')) {
                itemContext.domBlock(me, 'height');
                blocked = true;
            }
        }
        if (!blocked) {
            ownerContext.setContentHeight(me.innerCt.getHeight() + ownerContext.targetContext.getPaddingInfo().height);
        }
        return !blocked;
    }
});

Ext.Editor.override({
    activateEvent: "click",
    useHtml: false,
    htmlEncode: false,
    htmlDecode: false,
    initComponent: Ext.Function.createSequence(Ext.Editor.prototype.initComponent, function() {
        this.field.submitValue = false;
        this.initTarget();
    }),
    realign: function(autoSize) {
        var me = this;
        if (autoSize === true) {
            if (this.autoSize) {
                me.updateLayout();
                var autoSizeBehav = this.autoSize,
                    fieldWidth, fieldHeight;
                if (autoSizeBehav === true) {
                    autoSizeBehav = {
                        width: 'boundEl',
                        height: 'boundEl'
                    };
                }
                fieldWidth = me.getDimension(autoSizeBehav.width, 'getWidth', this.width);
                fieldHeight = me.getDimension(autoSizeBehav.height, 'getHeight', this.height);
                this.field.setSize(fieldWidth || this.field.getWidth(), fieldHeight || this.field.getHeight());
            }
        }
        me.alignTo(me.boundEl, me.alignment, me.offsets);
    },
    getDimension: function(type, getMethod, size) {
        switch (type) {
            case 'boundEl':
                return this.boundEl[getMethod]();
            case 'field':
                return undefined;
            default:
                return size;
        }
    },
    initTarget: function() {
        if (this.isSeparate) {
            this.field = Ext.ComponentManager.create(this.field, "textfield");
        }
        if (!Ext.isEmpty(this.target, false)) {
            var targetEl = Ext.net.getEl(this.target);
            if (!Ext.isEmpty(targetEl)) {
                this.initTargetEvents(targetEl);
            } else {
                var getTargetTask = new Ext.util.DelayedTask(function(task) {
                    targetEl = Ext.get(this.target);
                    if (!Ext.isEmpty(targetEl)) {
                        this.initTargetEvents(targetEl);
                        task.cancel();
                        delete this.getTargetTask;
                    } else {
                        task.delay(500, undefined, this, [task]);
                    }
                }, this);
                this.getTargetTask = getTargetTask;
                getTargetTask.delay(1, undefined, this, [getTargetTask]);
            }
        }
    },
    retarget: function(target) {
        if (this.getTargetTask) {
            this.getTargetTask.cancel();
            delete this.getTargetTask;
        }
        this.target = Ext.net.getEl(target);
        if (this.target && this.target.un && !Ext.isEmpty(this.activateEvent, false)) {
            if (this.target.isComposite) {
                this.target.each(function(item) {
                    item.un(this.activateEvent, this.activateFn, item.dom);
                }, this);
            } else {
                this.target.un(this.activateEvent, this.activateFn, this.target.dom);
            }
        }
        this.initTargetEvents(this.target);
    },
    initTargetEvents: function(targetEl) {
        this.target = targetEl;
        var ed = this,
            activate = function() {
                if (!ed.disabled) {
                    ed.startEdit(this);
                }
            };
        this.activateFn = activate;
        if (!Ext.isEmpty(this.activateEvent, false)) {
            if (this.target.isComposite) {
                this.target.each(function(item) {
                    item.on(this.activateEvent, this.activateFn, item.dom);
                }, this);
            } else {
                this.target.on(this.activateEvent, this.activateFn, this.target.dom);
            }
        }
    },
    onFieldBlur: function(field, e) {
        var me = this,
            target = Ext.Element.getActiveElement();
        if (me.editing && me.cancelOnBlur === true && me.selectSameEditor !== true) {
            me.cancelEdit();
        } else if (me.allowBlur === true && me.editing && me.selectSameEditor !== true) {
            me.completeEdit();
        }
        if (Ext.fly(target).isFocusable() || target.getAttribute('tabIndex')) {
            target.focus();
        }
    },
    startEdit: function(el, value) {
        if (!Ext.isDefined(value)) {
            this.completeEdit();
            this.boundEl = Ext.get(el);
            if (this.useHtml) {
                value = this.boundEl.dom.innerHTML;
                if (this.htmlEncode) {
                    value = Ext.util.Format.htmlEncode(value);
                }
            } else {
                value = Ext.String.trim(this.boundEl.dom[Ext.isGecko ? "textContent" : "innerText"]);
            }
        }
        this.callParent([el, value]);
        if (this.editing && Ext.isIE) {
            this.field.surpressBlur = true;
            Ext.defer(function() {
                this.field.surpressBlur = false;
                this.field.focus();
            }, 250, this);
        }
    },
    completeEdit: function(remainVisible) {
        var me = this,
            field = me.field,
            value;
        if (!me.editing) {
            return;
        }
        if (field.assertValue) {
            field.assertValue();
        }
        value = me.getValue();
        if (!field.isValid()) {
            if (me.revertInvalid !== false) {
                me.cancelEdit(remainVisible);
                return;
            }
        }
        if (String(value) === String(me.startValue) && me.ignoreNoChange) {
            me.hideEdit(remainVisible);
            return;
        }
        if (me.fireEvent('beforecomplete', me, value, me.startValue) !== false) {
            value = me.getValue();
            if (me.updateEl && me.boundEl) {
                if (this.htmlDecode) {
                    me.boundEl.update(Ext.util.Format.htmlDecode(value));
                } else {
                    me.boundEl.update(value);
                }
            }
            me.hideEdit(remainVisible);
            me.fireEvent('complete', me, value, me.startValue);
        }
    }
});
Ext.layout.container.Editor.override({
    autoSizeDefault: {
        width: 'boundEl',
        height: 'boundEl'
    }
});

Ext.net.XTemplate = function(config) {
    config = config || {};
    var html;
    this.proxyId = config.proxyId;
    if (config.el) {
        config.el = Ext.getDom(config.el);
        html = config.el.value || config.el.innerHTML;
    } else {
        html = config.html;
        if (Ext.isArray(html)) {
            html = html.join("");
        }
    }
    Ext.net.XTemplate.superclass.constructor.call(this, html, config.functions);
};
Ext.extend(Ext.net.XTemplate, Ext.XTemplate, {
    destroy: function() {
        Ext.net.ComponentManager.unregisterId(this);
    }
});

Ext.define('Ext.net.Viewport', {
    extend: 'Ext.container.Container',
    alias: 'widget.netviewport',
    requires: ['Ext.EventManager'],
    isViewPort: true,
    preserveElOnDestroy: true,
    ariaRole: 'application',
    viewportCls: Ext.baseCSSPrefix + 'viewport',
    initComponent: function() {
        var me = this,
            html = Ext.get(document.body.parentNode),
            el;
        Ext.getScrollbarSize();
        me.width = me.height = undefined;
        me.callParent(arguments);
        html.addCls(me.viewportCls);
        html.dom.style.height = "100%";
        if (me.autoScroll) {
            html.setStyle(me.getOverflowStyle());
            delete me.autoScroll;
        }
        me.el = el = Ext.get(me.renderTo || Ext.net.ResourceMgr.getAspForm() || Ext.getBody());
        el.setHeight = Ext.emptyFn;
        el.setWidth = Ext.emptyFn;
        el.dom.scroll = 'no';
        Ext.getBody().scroll = 'no';
        me.allowDomMove = false;
        me.renderTo = me.el;
        Ext.getBody().applyStyles({
            overflow: "hidden",
            margin: "0",
            padding: "0",
            border: "0px none",
            height: "100%"
        });
        if (me.rtl) {
            Ext.getBody().addCls("x-rtl");
        }
        this.el.applyStyles({
            height: "100%",
            width: "100%"
        });
    },
    applyTargetCls: function(targetCls) {
        this.el.addCls(targetCls);
    },
    onRender: function() {
        var me = this;
        me.callParent(arguments);
        me.width = Ext.Element.getViewportWidth();
        me.height = Ext.Element.getViewportHeight();
    },
    afterFirstLayout: function() {
        var me = this;
        me.callParent(arguments);
        setTimeout(function() {
            Ext.EventManager.onWindowResize(me.fireResize, me);
        }, 1);
    },
    fireResize: function(width, height) {
        if (width != this.width || height != this.height) {
            this.setSize(width, height);
        }
    },
    initHierarchyState: function(hierarchyState) {
        this.callParent([this.hierarchyState = Ext.rootHierarchyState]);
    },
    beforeDestroy: function() {
        var me = this;
        me.removeUIFromElement();
        me.el.removeCls(me.baseCls);
        Ext.fly(document.body.parentNode).removeCls(me.viewportCls);
        me.callParent();
    }
});

Ext.net.ResourceMgr = function() {
    return {
        id: "",
        url: "",
        theme: "blue",
        quickTips: true,
        cssClasses: {},
        cssIcons: {},
        submitDisabled: true,
        BLANK_IMAGE_URL: "",
        aspInputs: [],
        ns: "App",
        initAspInputs: function(inputs) {
            if (this.inputsInit || this.isMVC) {
                return;
            }
            if (!Ext.get("__EVENTTARGET")) {
                inputs = Ext.applyIf(inputs, {
                    "__EVENTTARGET": ""
                });
            }
            if (!Ext.get("__EVENTARGUMENT")) {
                inputs = Ext.applyIf(inputs, {
                    "__EVENTARGUMENT": ""
                });
            }
            Ext.iterate(inputs, function(key, value) {
                this.aspInputs.push(Ext.core.DomHelper.append(this.getAspForm() || Ext.getBody(), {
                    tag: "input",
                    type: "hidden",
                    name: key,
                    value: value
                }));
            }, this);
            this.inputsInit = true;
        },
        initGlyphFontFamily: function() {
            if (this.glyphFontFamily) {
                Ext.setGlyphFontFamily(this.glyphFontFamily);
            }
        },
        initAjaxTimeout: function() {
            var t = this.ajaxTimeout;
            if (Ext.isNumber(t)) {
                Ext.data.Connection.prototype.timeout = t;
                Ext.Ajax.timeout = t;
                Ext.net.DirectEvent.timeout = t;
                Ext.data.proxy.Server.prototype.timeout = t;
            }
        },
        resolveUrl: function(url) {
            if (url && Ext.net.StringUtils.startsWith(url, "~/")) {
                return url.replace(/^~/, Ext.isEmpty(this.appName, false) ? "" : ("/" + this.appName))
            }
            return url;
        },
        hasCssClass: function(id) {
            return !!this.cssClasses[id];
        },
        registerCssClass: function(id, cssClass, registerId) {
            if (!this.hasCssClass(id)) {
                if (!this.resourcesSheet) {
                    this.resourcesSheet = Ext.util.CSS.createStyleSheet("/* Ext.Net resources stylesheet */\n", "extnet-resources");
                }
                if (!Ext.isIE) {
                    var removeComments = /\/\*.*?\*\//img,
                        csssplitregexp = /([^{}]+)\{([^{}]+)+\}/img,
                        match;
                    cssClass = cssClass.replace(removeComments, "");
                    match = csssplitregexp.exec(cssClass)
                    while (match != null) {
                        this.resourcesSheet.insertRule(match[0], this.resourcesSheet.cssRules.length);
                        match = csssplitregexp.exec(cssClass);
                    }
                } else {
                    document.styleSheets["extnet-resources"].cssText += cssClass;
                }
                if (!Ext.isIE8m) {
                    Ext.util.CSS.refreshCache();
                }
                if (registerId !== false) {
                    this.cssClasses[id] = true;
                }
            }
        },
        toCharacterSeparatedFileName: function(name, separator) {
            if (Ext.isEmpty(name, false)) {
                return;
            }
            var matches = name.match(/([A-Z]+)[a-z]*|\d{1,}[a-z]{0,}/g);
            var temp = "";
            for (var i = 0; i < matches.length; i++) {
                if (i !== 0) {
                    temp += separator;
                }
                temp += matches[i].toLowerCase();
            }
            return temp;
        },
        getIcon: function(icon) {
            this.registerIcon(icon);
            icon = icon.toLowerCase();
            return !Ext.net.StringUtils.startsWith(icon, "icon-") ? ("icon-" + icon) : icon;
        },
        getRenderTarget: function() {
            return Ext.net.ResourceMgr.getAspForm() || Ext.getBody();
        },
        setIconCls: function(cmp, propertyName) {
            var val = cmp[propertyName];
            if (val && Ext.isString(val) && val.indexOf('#') === 0) {
                cmp[propertyName] = this.getIcon(val.substring(1));
            }
        },
        getIconUrl: function (icon) {
            
            var iconName = this.toCharacterSeparatedFileName(icon, "_"),
                template = "/{0}icons/{1}-png/ext.axd",
                templateCdn = "{0}/icons/{1}.png",
                appName = Ext.isEmpty(this.appName, false) ? "" : (this.appName + "/"),
                path = this.cdnPath || this.resourcePath;
            return Ext.net.StringUtils.format(path ? templateCdn : template, path || appName, iconName);
        },
        registerIcon: function (name, init) {
            
            if (typeof name === 'string' && !!this.cssIcons[name]) {
                return;
            }
            var buffer = [],
                templateEmb = ".{0}{background-image:url(\"icons/{2}-png/ext.axd\") !important;background-repeat:no-repeat;}",
                templateCdn = ".{0}{background-image:url(\"icons/{2}.png\") !important;background-repeat:no-repeat;}",
                appName = Ext.isEmpty(this.appName, false) ? "" : (this.appName + "/");
            Ext.each(name, function(icon) {
                if (!!this.cssIcons[icon.name || icon]) {
                    return;
                }
                if (!Ext.isObject(icon)) {
                    icon = {
                        name: icon
                    };
                }
                var iconName = this.toCharacterSeparatedFileName(icon.name, "_"),
                    iconRule = icon.name.toLowerCase(),
                    id = !Ext.net.StringUtils.startsWith(iconRule, "icon-") ? ("icon-" + iconRule) : iconRule,
                    path = this.cdnPath || this.resourcePath;
                if (!this.hasCssClass(id)) {
                    if (icon.url) {
                        buffer.push(Ext.net.StringUtils.format(".{0}{background-image:url(\"{1}\") !important;background-repeat:no-repeat;}", id, icon.url));
                    } else {
                        if (path) {
                            buffer.push(Ext.net.StringUtils.format(templateCdn, id, path, iconName));
                        } else {
                            buffer.push(Ext.net.StringUtils.format(templateEmb, id, appName, iconName));
                        }
                    }
                    this.cssClasses[id] = true;
                    this.cssIcons[icon.name] = true;
                }
            }, this);
            if (buffer.length > 0) {
                this.registerCssClass("", buffer.join(" "), false);
            }
        },
        getCmp: function(id) {
            var d = id.split("."),
                o = window[d[0]];
            Ext.each(d.slice(1), function(v) {
                if (!o) {
                    return null;
                }
                o = o[v];
            });
            return o ? Ext.getCmp(o.id) || o : null;
        },
        destroyCmp: function(id, contentOnly) {
            var obj = Ext.getCmp(id) || window[id];
            if (!Ext.isObject(obj) || (!obj.destroy && !obj.destroyStore)) {
                obj = Ext.net.ResourceMgr.getCmp(id);
            }
            if (Ext.isObject(obj) && (obj.destroy || obj.destroyStore)) {
                try {
                    if (contentOnly) {
                        obj.clearContent && obj.clearContent();
                    } else {
                        obj.destroyStore ? obj.destroyStore() : obj.destroy();
                    }
                } catch (e) {}
            }
        },
        init: function(config) {
            window.X = window.Ext;
            window.X.net.RM = this;
            Ext.apply(this, config || {});
            if (this.quickTips !== false) {
                Ext.onReady(function() {
                    Ext.tip.QuickTipManager.init();
                });
            }
            if (Ext.isIE6 || Ext.isIE7 || Ext.isAir) {
                if (Ext.isEmpty(this.BLANK_IMAGE_URL)) {
                    var path = this.cdnPath || this.resourcePath;
                    if (path) {
                        Ext.BLANK_IMAGE_URL = path + "/extjs/resources/themes/images/default/s.gif";
                    } else {
                        Ext.BLANK_IMAGE_URL = (Ext.isEmpty(this.appName, false) ? "" : ("/" + this.appName)) + "/extjs/resources/themes/images/default/s-gif/ext.axd";
                    }
                } else {
                    Ext.BLANK_IMAGE_URL = this.BLANK_IMAGE_URL;
                }
            }
            this.registerPageResources();
            if (this.theme) {
                if (Ext.isReady) {
                    Ext.fly(document.body.parentNode).addCls("x-theme-" + this.theme);
                } else {
                    Ext.onReady(function() {
                        Ext.fly(document.body.parentNode).addCls("x-theme-" + this.theme);
                    }, this);
                }
            }
            if (this.icons) {
                this.registerIcon(this.icons, true);
            }
            if (!Ext.isEmpty(this.ns)) {
                if (Ext.isArray(this.ns)) {
                    Ext.each(this.ns, function(ns) {
                        if (ns) {
                            Ext.ns(ns);
                        }
                    });
                } else {
                    Ext.ns(this.ns);
                }
            }
            Ext.onReady(function() {
                if (this.aspForm && this.isMVC !== true && !window.theForm) {
                    window.theForm = document.forms[this.aspForm];
                    if (!window.theForm) {
                        window.theForm = document[this.aspForm];
                    }
                    window.__doPostBack = function(et, ea) {
                        var form = Ext.net.ResourceMgr.getAspForm(true);
                        if (form && (!form.onsubmit || (form.onsubmit() != false))) {
                            form.__EVENTTARGET.value = et;
                            form.__EVENTARGUMENT.value = ea;
                            form.submit();
                        }
                    };
                }
                Ext.Function.defer(function() {
                    if (!this.inputsInit) {
                        this.initAspInputs({});
                    }
                }, 10, this);
            }, this);
            this.initGlyphFontFamily();
            this.initAjaxTimeout();
        },
        registerPageResources: function() {
            Ext.select("script").each(function(el) {
                var url = el.dom.getAttribute("src");
                if (!Ext.isEmpty(url) && !this.queue.contains(url)) {
                    this.queue.buffer.push({
                        url: url,
                        loading: false
                    });
                }
            }, this);
            Ext.select('link[type="text/css"]').each(function(el) {
                var url = el.dom.getAttribute("href");
                if (!Ext.isEmpty(url) && !this.queue.contains(url)) {
                    this.queue.buffer.push({
                        url: url,
                        loading: false
                    });
                }
            }, this);
        },
        getAspForm: function(dom) {
            if (this.aspForm) {
                return Ext[dom ? "getDom" : "get"](this.aspForm);
            }
        },
        load: function(config, groupCallback) {
            this.queue.clear();
            if (groupCallback) {
                groupCallback = {
                    fn: groupCallback,
                    counter: config.length || 1,
                    config: config,
                    step: function() {
                        this.counter--;
                        if (this.counter === 0) {
                            this.fn.apply(window, [this.config]);
                        }
                    }
                };
            }
            Ext.each(Ext.isArray(config) ? config : [config], function(config) {
                if (Ext.isString(config)) {
                    var url = config;
                    config = {
                        url: url
                    };
                    if (url.substring(url.length - 4) === ".css") {
                        config.mode = "css";
                    }
                }
                config.options = Ext.applyIf(config.options || {}, {
                    mode: config.mode || "js"
                });
                if (config.callback) {
                    config.loadCallback = config.callback;
                    delete config.callback;
                }
                if (groupCallback) {
                    config.groupCallback = groupCallback;
                }
                if (!Ext.isEmpty(config.url)) {
                    this.queue.enqueue(config);
                }
            }, this);
            this.doLoad();
        },
        doLoad: function() {
            var config = this.queue.peek();
            if (config === undefined) {
                return;
            }
            var url = config.url,
                item, contains = this.queue.contains(url);
            if (config.force === true || contains !== true) {
                if (contains !== true) {
                    this.queue.buffer.push({
                        url: url,
                        loading: true
                    });
                }
                if (url && url.indexOf("://") >= 0) {
                    this.scriptTagRequest(url, config);
                } else {
                    Ext.Ajax.request(Ext.apply({
                        scope: this,
                        method: "GET",
                        callback: this.onResult,
                        disableCaching: false
                    }, config));
                }
            } else {
                item = this.queue.getItem(url);
                if (item && item.loading) {
                    this.queue.waitingList.push(config);
                    return;
                }
                if (config.loadCallback) {
                    config.loadCallback.apply(window, [config]);
                }
                if (config.groupCallback) {
                    config.groupCallback.step();
                }
                this.queue.dequeue(config);
                this.doLoad();
            }
        },
        scriptTagRequest: function(url, config) {
            var el, head = document['head'] || document.getElementsByTagName('head')[0];
            if (config.mode === "css") {
                el = document.createElement('link');
                el.type = 'text/css';
                el.rel = 'stylesheet';
                el.href = url;
            } else {
                el = document.createElement('script');
                el.type = 'text/javascript';
                el.src = url;
            }
            el.onload = el.onreadystatechange = Ext.Function.bind(this.scriptTagOnResult, this, [config], 0);
            el.onerror = Ext.Function.bind(this.scriptTagOnError, this, [config], 0);
            el.async = false;
            el.defer = false;
            config.el = el;
            head.insertBefore(el, head.lastChild);
        },
        scriptTagOnError: function(options) {
            options.el.onload = options.el.onreadystatechange = options.el.onerror = null;
            Ext.net.DirectEvent.showFailure({
                status: "",
                statusText: "Failure"
            }, options.url + " is not loaded correctly");
            this.queue.dequeue(options);
            this.doLoad();
        },
        scriptTagOnResult: function(options, event) {
            event = event || window.event;
            if ((event && event.type == 'load') || (/loaded|complete/.test(options.el.readyState) && (!document.documentMode || document.documentMode < 9))) {
                options.el.onload = options.el.onreadystatechange = options.el.onerror = null;
                var i = 0,
                    item = this.queue.getItem(options.url);
                if (item !== null) {
                    item.loading = false;
                }
                if (options.loadCallback) {
                    options.loadCallback.apply(window, [options]);
                }
                if (options.groupCallback) {
                    options.groupCallback.step();
                }
                while (this.queue.waitingList.length > i) {
                    item = this.queue.waitingList[i];
                    if (item.url === options.url) {
                        if (item.loadCallback) {
                            item.loadCallback.apply(window, [item]);
                        }
                        if (item.groupCallback) {
                            item.groupCallback.step();
                        }
                        Ext.Array.remove(this.queue.waitingList, item);
                    } else {
                        i++;
                    }
                }
                this.queue.dequeue(options);
                this.doLoad();
            }
        },
        onResult: function(options, success, response) {
            if (success === true) {
                if (options.mode === "css") {
                    Ext.util.CSS.createStyleSheet(response.responseText);
                } else {
                    var head = document['head'] || document.getElementsByTagName('head')[0],
                        el = document.createElement("script");
                    el.setAttribute("type", "text/javascript");
                    el.text = response.responseText;
                    head.insertBefore(el, head.lastChild);
                }
                var i = 0,
                    item = this.queue.getItem(options.url);
                if (item !== null) {
                    item.loading = false;
                }
                if (options.loadCallback) {
                    options.loadCallback.apply(window, [options]);
                }
                if (options.groupCallback) {
                    options.groupCallback.step();
                }
                while (this.queue.waitingList.length > i) {
                    item = this.queue.waitingList[i];
                    if (item.url === options.url) {
                        if (item.loadCallback) {
                            item.loadCallback.apply(window, [item]);
                        }
                        if (item.groupCallback) {
                            item.groupCallback.step();
                        }
                        Ext.Array.remove(this.queue.waitingList, item);
                    } else {
                        i++;
                    }
                }
            } else {
                Ext.net.DirectEvent.showFailure(response, response.responseText);
            }
            this.queue.dequeue(options);
            this.doLoad();
        },
        queue: function() {
            return {
                js: [],
                css: [],
                buffer: [],
                waitingList: [],
                enqueue: function(item) {
                    this[item.options.mode].push(item);
                },
                dequeue: function(item) {
                    var mode = item.options.mode,
                        temp = this[mode][0];
                    this[mode] = this[mode].slice(1);
                    return temp;
                },
                clear: function() {
                    this.js = [];
                    this.css = [];
                },
                contains: function(url) {
                    url = url.replace("&amp;", "&");
                    for (var i = 0; i < this.buffer.length; i++) {
                        if (this.buffer[i].url.replace("&amp;", "&") === url) {
                            return true;
                        }
                    }
                    return false;
                },
                getItem: function(url) {
                    for (var i = 0; i < this.buffer.length; i++) {
                        if (this.buffer[i].url === url) {
                            return this.buffer[i];
                        }
                    }
                    return null;
                },
                peek: function() {
                    return this.css.length > 0 ? this.css[0] : this.js[0];
                }
            };
        }(),
        setTheme: function(url, name, rtl, debug) {
            var lowerUrl, path = this.cdnPath || this.resourcePath,
                ss, suffix, html;
            if (this.theme == "neptune" || name == "neptune") {
                return;
            }
            url = url || "";
            lowerUrl = url.toLowerCase();
            suffix = (rtl ? "-rtl" : "") + (debug ? "-debug" : "");
            if (Ext.isEmpty(lowerUrl) || lowerUrl == "blue" || lowerUrl == "default" || lowerUrl == "classic") {
                url = path ? (path + "/extjs/resources/ext-theme-classic/ext-theme-classic-all" + suffix + ".css") : "~/extjs/resources/ext_theme_classic/ext-theme-classic-all" + suffix + "-embedded-css/ext.axd";
                name = "classic";
            } else if (lowerUrl == "gray") {
                url = path ? (path + "/extjs/resources/ext-theme-gray/ext-theme-gray-all" + suffix + ".css") : "~/extjs/resources/ext_theme_gray/ext-theme-gray-all" + suffix + "-embedded-css/ext.axd";
                name = "gray";
            } else if (lowerUrl == "access") {
                url = path ? (path + "/extjs/resources/ext-theme-access/ext-theme-access-all" + suffix + ".css") : "~/extjs/resources/ext_theme_access/ext-theme-access-all" + suffix + "-embedded-css/ext.axd";
                name = "access";
            }
            url = this.resolveUrl(url);
            html = document.body.parentNode;
            if (this.theme) {
                Ext.fly(html).removeCls("x-theme-" + this.theme);
            }
            if (name) {
                this.theme = name;
                Ext.fly(html).addCls("x-theme-" + this.theme);
            }
            ss = document.createElement("link");
            ss.setAttribute("rel", "stylesheet");
            ss.setAttribute("type", "text/css");
            ss.setAttribute("id", "ext-theme");
            ss.setAttribute("href", url);
            document.getElementsByTagName("head")[0].replaceChild(ss, document.getElementById("ext-theme"));
        },
        notifyScriptLoaded: function() {
            if (typeof Sys !== "undefined" && typeof Sys.Application !== "undefined" && typeof Sys.Application.notifyScriptLoaded !== "undefined") {
                Sys.Application.notifyScriptLoaded();
            }
        }
    };
}();

Ext.net.StringUtils = function() {
    var _formatRe = /\{(\d+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g,
        _argRe = /(['"])(.*?)\1\s*(?:,|$)/g;
    return {
        format: function(format) {
            var args = Ext.Array.toArray(arguments, 1),
                fm = Ext.util.Format;
            return format.replace(_formatRe, function(m, idx, fn, fmArgs) {
                var replaceValue = args[parseInt(idx, 10)],
                    values, match;
                if (fn) {
                    values = [replaceValue];
                    while (match = _argRe.exec(fmArgs)) {
                        values.push(match[2]);
                    }
                    return fm[fn].apply(fm, values);
                }
                return replaceValue;
            });
        },
        startsWith: function(str, value) {
            return str.match("^" + value) !== null;
        },
        endsWith: function(str, value) {
            return str.match(value + "$") !== null;
        }
    };
}();

Ext.isEmptyObj = function(obj) {
    if (typeof(obj) === "undefined" || obj === null) {
        return true;
    }
    if (!(!Ext.isEmpty(obj) && typeof obj == "object")) {
        return false;
    }
    for (var p in obj) {
        return false;
    }
    return true;
};
Ext.net.clone = function(o) {
    if (!o || "object" !== typeof o) {
        return o;
    }
    var c = "[object Array]" === Object.prototype.toString.call(o) ? [] : {},
        p, v;
    for (p in o) {
        if (o.hasOwnProperty(p)) {
            v = o[p];
            c[p] = (v && "object" === typeof v) ? Ext.net.clone(v) : v;
        }
    }
    return c;
};
Ext.net.on = function(target, eventName, handler, scope, mode, cfg) {
    var el = target;
    if (typeof target == "string") {
        el = Ext.get(target);
    }
    if (!Ext.isEmpty(el)) {
        if (mode && mode == "client") {
            el.on(eventName, handler.fn, scope, handler);
        } else {
            el.on(eventName, handler, scope, cfg);
        }
    }
};
Ext.net.lazyInit = function(controls) {
    if (!Ext.isArray(controls)) {
        return;
    }
    var cmp, i;
    for (i = 0; i < controls.length; i++) {
        cmp = Ext.getCmp(controls[i]);
        if (!Ext.isEmpty(cmp)) {
            window[controls[i]] = cmp;
        }
    }
};
Ext.net.getEl = function(el, skipDeep) {
    if (Ext.isEmpty(el, false)) {
        return null;
    }
    if (el.isComposite) {
        return el;
    }
    if (el.getEl) {
        return el.getEl();
    }
    if (el.el) {
        return el.el;
    }
    var cmp = Ext.getCmp(el);
    if (!Ext.isEmpty(cmp)) {
        return cmp.getEl();
    }
    var tEl = Ext.get(el);
    if (Ext.isEmpty(tEl) && skipDeep !== true) {
        try {
            return Ext.net.getEl(eval("(" + el + ")"), true);
        } catch (e) {}
    }
    return tEl;
};
Ext.net.replaceContent = function(cmp, contentEl, html) {
    contentEl = Ext.net.getEl(contentEl);
    if (!Ext.isEmpty(contentEl)) {
        contentEl.remove();
    }
    var el = Ext.net.append(Ext.getBody(), html, null, true);
    el.removeCls(["x-hidden", "x-hide-display"]);
    cmp.getContentTarget().dom.appendChild(el.dom);
};
Ext.net.replaceWith = function(config) {
    var id = Ext.String.format("el_{0}_container", config.id || ""),
        el = Ext.fly(id) || Ext.fly(config.id);
    if (!Ext.isEmpty(el)) {
        el.replaceWith({
            id: id,
            tag: "span"
        }).update(config.html, true);
    }
};
Ext.net.addTo = function(container, items, clear) {
    if (Ext.isString(container)) {
        var cmp = Ext.getCmp(container);
        if (!cmp) {
            cmp = Ext.net.ResourceMgr.getCmp(container);
        }
        container = cmp;
    }
    if (clear) {
        container.removeAll();
    }
    container.add(items);
};
Ext.net.renderTo = function(container, items) {
    if (Ext.isString(container)) {
        container = Ext.net.getEl(container);
    }
    Ext.each(items, function(item) {
        item.renderTo = container;
        Ext.ComponentManager.create(item);
    });
};
Ext.net._renderTo = function(cfg, cmp) {
    if (cfg.mode == "item") {
        cfg.ct.insert(cfg.index, cmp);
    } else if (cfg.mode == "el") {
        if (Ext.isArray(cmp)) {
            Ext.each(cmp, function(c) {
                Ext.net._renderTo(cfg, c);
            });
        } else {
            cmp = Ext.ComponentManager.create(cmp);
            cmp.render(cfg.ct, cfg.position);
        }
    }
};
Ext.net.append = function(elTo, html, callback, wait) {
    html = html || "";
    var id = Ext.id(),
        me = this,
        dom = Ext.getDom(elTo),
        interval, createdEl, fn;
    fn = function() {
        if (wait) {
            if (!document.getElementById(id)) {
                return false;
            }
            clearInterval(interval);
        }
        var DOC = document,
            hd = DOC.getElementsByTagName("head")[0],
            re = /(?:<script([^>]*)?>)((\n|\r|.)*?)(?:<\/script>)/ig,
            reStyle = /(?:<style([^>]*)?>)((\n|\r|.)*?)(?:<\/style>)/ig,
            reLink = /(?:<link([^>]*)?\/>)/ig,
            srcRe = /\ssrc=([\'\"])(.*?)\1/i,
            typeRe = /\stype=([\'\"])(.*?)\1/i,
            hrefRe = /\shref=([\'\"])(.*?)\1/i,
            match, attrs, hrefMatch, srcMatch, typeMatch, el, s;
        while ((match = reLink.exec(html))) {
            attrs = match[1];
            hrefMatch = attrs ? attrs.match(hrefRe) : false;
            if (hrefMatch && hrefMatch[2]) {
                s = DOC.createElement("link");
                s.href = hrefMatch[2];
                s.rel = "stylesheet";
                typeMatch = attrs.match(typeRe);
                if (typeMatch && typeMatch[2]) {
                    s.type = typeMatch[2];
                }
                hd.appendChild(s);
            }
        }
        while ((match = reStyle.exec(html))) {
            if (match[2] && match[2].length > 0) {
                Ext.net.ResourceMgr.registerCssClass("", match[2], false);
            }
        }
        while ((match = re.exec(html))) {
            attrs = match[1];
            srcMatch = attrs ? attrs.match(srcRe) : false;
            if (srcMatch && srcMatch[2]) {
                s = DOC.createElement("script");
                s.src = srcMatch[2];
                typeMatch = attrs.match(typeRe);
                if (typeMatch && typeMatch[2]) {
                    s.type = typeMatch[2];
                }
                hd.appendChild(s);
            } else if (match[2] && match[2].length > 0) {
                if (window.execScript) {
                    window.execScript(match[2]);
                } else {
                    window.eval.call(window, match[2]);
                }
            }
        }
        if (wait) {
            el = DOC.getElementById(id);
            if (el) {
                Ext.removeNode(el);
            }
        }
        Ext.callback(callback, me);
    };
    if (wait) {
        html += '<span id="' + id + '"></span>';
        interval = setInterval(fn, 20);
    }
    createdEl = Ext.DomHelper.append(elTo, html.replace(/(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/ig, "").replace(/(?:<style.*?>)((\n|\r|.)*?)(?:<\/style>)/ig, "").replace(/(?:<link([^>]*)?\/>)/ig, ""), true);
    if (!wait) {
        fn();
    }
    if (createdEl && createdEl.id == id) {
        createdEl = createdEl.prev();
    }
    return createdEl;
};
Ext.net.findField = function(name, scope) {
    if (Ext.isEmpty(name)) {
        return;
    }
    var cmp;
    if (scope) {
        if (!(scope.createForm && scope.getForm)) {
            scope = scope.up("form");
        }
        if (scope) {
            cmp = scope.down("field[name='" + name + "']");
            if (cmp && cmp.length > 0) {
                return cmp[0];
            }
        }
    }
    cmp = Ext.ComponentQuery.query("field[name='" + name + "']");
    if (cmp && cmp.length > 0) {
        return cmp[0];
    }
    return Ext.getCmp(name);
};
Ext.net.loadResources = function(cfg, callback, scope) {
    if (cfg && cfg['x.res']) {
        if (cfg['x.res'].ns) {
            Ext.ns.apply(Ext, cfg['x.res'].ns);
        }
        if (cfg['x.res'].res) {
            Ext.net.ResourceMgr.load(cfg['x.res'].res, function() {
                if (callback) {
                    Ext.callback(callback, scope, [cfg.config ? Ext.decode(cfg.config) : {}]);
                }
            });
        }
    } else {
        if (callback) {
            Ext.callback(callback, scope, [cfg.config || {}]);
        }
    }
};
Ext.net.widgetFactory = function(instanceName, isInstance, configFn) {
    var widgetCache, fn = function(addConfig, cache, merge) {
        if (cache && widgetCache) {
            return widgetCache;
        }
        var config = merge ? Ext.merge(configFn.call(this), addConfig || {}) : Ext.applyIf(addConfig || {}, configFn.call(this)),
            widget = isInstance ? Ext.create(instanceName, config) : config;
        if (cache) {
            widgetCache = widget;
            if (isInstance && widget.on) {
                widget.on("destroy", function() {
                    widgetCache = null;
                });
            }
        } else {
            if (widgetCache && Ext.isFunction(widgetCache.destroy)) {
                widgetCache.destroy();
            }
            widgetCache = null;
        }
        return widget;
    };
    return fn;
};
if (typeof RegExp.escape !== "function") {
    RegExp.escape = function(s) {
        if ("string" !== typeof s) {
            return s;
        }
        return s.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, "\\$1");
    };
}

Ext.util.Format.usMoneyTemp = Ext.util.Format.usMoney;
Ext.util.Format.usMoney = function(v) {
    return Ext.util.Format.usMoneyTemp(String(v).replace(/[^0-9.\-]/g, ""));
};
Ext.util.Format.euroMoney = function(v) {
    v = String(v).replace(/[^0-9.\-]/g, "");
    v = (Math.round((v - 0) * 100)) / 100;
    v = (v == Math.floor(v)) ? v + ".00" : ((v * 10 == Math.floor(v * 10)) ? v + "0" : v);
    v = String(v);
    var ps = v.split('.'),
        whole = ps[0],
        sub = ps[1] ? ',' + ps[1] : ',00',
        r = /(\d+)(\d{3})/;
    while (r.test(whole)) {
        whole = whole.replace(r, '$1' + '.' + '$2');
    }
    return whole + sub + " &euro;";
};
Ext.util.Format.checkbox = function(v) {
    var cssPrefix = Ext.baseCSSPrefix,
        cls = [cssPrefix + 'grid-checkheader'];
    if (v) {
        cls.push(cssPrefix + 'grid-checkheader-checked');
    }
    return '<div class="' + cls.join(' ') + '">&#160;</div>';
};

Ext.LoadMask.override({
    initComponent: function() {
        if (!Ext.isDefined(this.initialConfig.msg)) {
            this.msg = Ext.view.AbstractView.prototype.loadingText;
        }
        if (Ext.isEmpty(this.msg)) {
            this.msgCls = this.msgCls ? this.msgCls + " empty-loadmask" : "empty-loadmask";
        }
        this.callParent(arguments);
    },
    setZIndex: function(index) {
        var me = this,
            tmpIndex, owner = me.activeOwner;
        if (owner) {
            tmpIndex = parseInt(owner.el.getStyle('zIndex'), 10) + 1;
            if (Ext.isNumber(tmpIndex)) {
                index = tmpIndex;
            }
        }
        me.getMaskEl().setStyle('zIndex', index - 1);
        return me.mixins.floating.setZIndex.apply(me, arguments);
    }
});
Ext.net.Mask = function() {
    var instance, bmask, init = function() {
        bmask = Ext.getBody().createChild({
            cls: "x-page-mask",
            style: "top:0;left:0;z-index:20000;position:absolute;background-color:transparent,width:100%,height:100%,zoom:1;"
        }).enableDisplayMode("block").hide();
        Ext.EventManager.onWindowResize(function() {
            bmask.setSize(Ext.Element.getViewWidth(false), Ext.Element.getViewHeight(false));
            var scroll = Ext.getBody().getScroll();
            bmask.setStyle({
                top: scroll.top + "px",
                left: scroll.left + "px"
            });
        });
    };
    return {
        show: function(cfg) {
            this.hide();
            cfg = Ext.apply({
                msg: Ext.view.AbstractView.prototype.loadingText,
                msgCls: "x-mask-loading",
                el: Ext.getBody()
            }, cfg || {});
            if (cfg.el == Ext.getBody()) {
                if (Ext.isEmpty(bmask)) {
                    init();
                }
                Ext.getBody().addCls("x-masked");
                bmask.setSize(Ext.Element.getViewWidth(false), Ext.Element.getViewHeight(false)).show();
                var scroll = Ext.getBody().getScroll();
                bmask.setStyle({
                    top: scroll.top + "px",
                    left: scroll.left + "px"
                });
                cfg.el = bmask;
            } else {
                cfg.el = Ext.net.getEl(cfg.el);
            }
            cfg.el.mask(cfg.msg, cfg.msgCls);
            instance = cfg.el;
            return instance;
        },
        hide: function() {
            if (instance) {
                instance.unmask();
            }
            if (bmask) {
                Ext.getBody().removeCls("x-masked");
                bmask.hide();
            }
            if (Ext.getBody().isMasked() === true) {
                Ext.getBody().unmask();
            }
        }
    };
}();

Ext.apply(Ext.form.VTypes, {
    daterange: function(val, field) {
        var date = field.parseDate(val);
        if (date) {
            if (field.startDateField && (!this.dateRangeMax || (date.getTime() !== this.dateRangeMax.getTime())) && !this.startValidating) {
                var start = Ext.getCmp(field.startDateField);
                this.dateRangeMax = date;
                start.setMaxValue(date);
                this.startValidating = true;
                start.validate();
                delete this.startValidating;
            } else if (field.endDateField && (!this.dateRangeMin || (date.getTime() !== this.dateRangeMin.getTime())) && !this.endValidating) {
                var end = Ext.getCmp(field.endDateField);
                this.dateRangeMin = date;
                end.setMinValue(date);
                this.endValidating = true;
                end.validate();
                delete this.endValidating;
            }
        }
        return true;
    },
    daterangeText: 'Start date must be less than end date',
    password: function(val, field) {
        if (field.initialPassField) {
            var pwd = Ext.isString(field.initialPassField) ? Ext.getCmp(field.initialPassField) : field.initialPassField;
            if (pwd) {
                if (pwd.processRawValue) {
                    return pwd ? (val === pwd.processRawValue(pwd.getRawValue())) : false;
                } else {
                    return pwd ? (val === pwd.getRawValue()) : false;
                }
            }
            return false;
        }
        return true;
    },
    passwordText: "Passwords do not match",
    ipRegExp: /^([1-9][0-9]{0,1}|1[013-9][0-9]|12[0-689]|2[01][0-9]|22[0-3])([.]([1-9]{0,1}[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){2}[.]([1-9][0-9]{0,1}|1[0-9]{2}|2[0-4][0-9]|25[0-4])$/,
    ip: function(val, field) {
        return Ext.form.VTypes.ipRegExp.test(val);
    },
    ipText: "Invalid IP Address format"
});

Ext.net.Notification = function() {
    var notifications = [];
    return {
        getDefaultOffset: function() {
            var defaultOffset = [-10, -10];
            if (!Ext.isIE9m) {
                if (Ext.getBody().getHeight() > Ext.Element.getViewportHeight()) {
                    defaultOffset[0] = -10 - Ext.getScrollbarSize().width;
                }
                if (Ext.getBody().getWidth() > Ext.Element.getViewportWidth()) {
                    defaultOffset[1] = -10 - Ext.getScrollbarSize().height;
                }
            }
            return defaultOffset;
        },
        notify: function(title, msg) {
            if (Ext.isString(title)) {
                Ext.net.Notification.show({
                    title: title,
                    html: msg || ""
                });
            } else {
                Ext.net.Notification.show(title);
            }
        },
        show: function(config) {
            if (config && (config.items || config.dockedItems)) {
                var resources = [];
                if (config.items && config.items['x.res']) {
                    if (config.items['x.res'].ns) {
                        Ext.ns.apply(Ext, config.items['x.res'].ns);
                    }
                    if (config.items['x.res'].res) {
                        resources = config.items['x.res'].res;
                    }
                    config.items = config.items.config;
                }
                if (config.dockedItems && config.dockedItems['x.res']) {
                    if (config.dockedItems['x.res'].ns) {
                        Ext.ns.apply(Ext, config.dockedItems['x.res'].ns);
                    }
                    if (config.dockedItems['x.res'].res) {
                        resources = Ext.Array.push(resources, config.dockedItems['x.res'].res);
                    }
                    config.dockedItems = config.dockedItems.config;
                }
                if (resources.length > 0) {
                    Ext.net.ResourceMgr.load(resources, Ext.Function.bind(this.show, this, [config]));
                    return;
                } else {
                    if (Ext.isString(config.items)) {
                        config.items = Ext.decode(config.items);
                    }
                    if (Ext.isString(config.dockedItems)) {
                        config.dockedItems = Ext.decode(config.dockedItems);
                    }
                }
            }
            config = config || {};
            var removeHeight = (Ext.isDefined(config.height) && !config.height) || (config.bodyStyle && config.bodyStyle.match(/height\s*:\s*auto/g));
            config = Ext.applyIf(config, {
                width: 200,
                height: 100,
                autoHide: true,
                plain: false,
                resizable: false,
                draggable: false,
                alignToCfg: {
                    el: document,
                    position: "br-br",
                    offset: this.getDefaultOffset()
                },
                showMode: "grid",
                closeVisible: false,
                bringToFront: false,
                pinEvent: "none",
                hideDelay: 2500,
                shadow: false,
                showPin: false,
                pinned: false,
                showFx: {
                    fxName: "slideIn",
                    args: ["b", {}]
                },
                hideFx: {
                    fxName: "slideOut",
                    args: ["b", {}]
                },
                focus: Ext.emptyFn,
                stopHiding: function() {
                    this.tools.close.show();
                    this.pinned = true;
                    if (this.autoHide) {
                        this.hideTask.cancel();
                    }
                },
                isStandardAlign: function() {
                    return this.alignToCfg.el == document && this.alignToCfg.position == "br-br";
                },
                getStatndardAlign: function() {
                    var w = [];
                    for (var i = 0; i < notifications.length; i++) {
                        var window = notifications[i];
                        if (window.isStandardAlign()) {
                            w.push(window);
                        }
                    }
                    return w;
                },
                getOffset: function() {
                    var offset = [],
                        predefinedOffset = this.alignToCfg.offset || Ext.net.Notification.getDefaultOffset();
                    offset.push(predefinedOffset[0]);
                    offset.push(predefinedOffset[1]);
                    if (this.showMode == "grid" && this.isStandardAlign()) {
                        var saw = this.getStatndardAlign(),
                            height = this.getSize().height - offset[1],
                            width = this.getSize().width - offset[0],
                            yPos = Ext.fly(this.alignToCfg.el).getViewSize().height - height,
                            xPos = Ext.fly(this.alignToCfg.el).getViewSize().width - width,
                            found = false,
                            isIntersect = function(tBox, box) {
                                tBox.x2 = tBox.x + tBox.width;
                                tBox.y2 = tBox.y + tBox.height;
                                box.x2 = box.x + box.width;
                                box.y2 = box.y + box.height;
                                if ((tBox.x2 - box.x) <= 0 || (box.x2 - tBox.x) <= 0) {
                                    return false;
                                }
                                if ((tBox.y2 - box.y) <= 0 || (box.y2 - tBox.y) <= 0) {
                                    return false;
                                }
                                return true;
                            };
                        while (xPos >= 0 && !found) {
                            while (yPos >= 0 && !found) {
                                var intersect = false;
                                for (var i = 0; i < saw.length; i++) {
                                    var window = saw[i],
                                        box = window.getBox();
                                    if (box.width == 0 && box.height == 0) {
                                        box = window._defaultBox;
                                    }
                                    if (isIntersect({
                                            x: xPos,
                                            y: yPos,
                                            width: width,
                                            height: height
                                        }, box)) {
                                        intersect = true;
                                        break;
                                    }
                                }
                                found = !intersect;
                                if (!found) {
                                    yPos -= height;
                                }
                            }
                            if (!found) {
                                yPos = Ext.fly(this.alignToCfg.el).getViewSize().height - height;
                                xPos -= width;
                            }
                        }
                        if (found) {
                            this._defaultBox = {
                                x: xPos,
                                y: yPos,
                                width: width,
                                height: height
                            };
                            offset[0] = offset[0] + ((xPos + width) - Ext.fly(this.alignToCfg.el).getViewSize().width);
                            offset[1] = offset[1] + ((yPos + height) - Ext.fly(this.alignToCfg.el).getViewSize().height);
                        }
                    }
                    return offset;
                },
                afterShow: function() {
                    var offset = this.getOffset(),
                        listeners;
                    notifications.push(this);
                    this._showing = true;
                    this.alignOffset = offset;
                    if (this.bringToFront) {
                        this.toFront();
                    }
                    this.el.alignTo(this.alignToCfg.el || document, this.alignToCfg.position || "br-br", offset);
                    this.el.setDisplayed(this.showFx.fxName == "frame" || this.showFx.fxName == "highlight");
                    this.el[this.showFx.fxName].apply(this.el, this.showFx.args);
                    listeners = {
                        beforeanimate: this.beforeAnimate,
                        afteranimate: this._afterShow,
                        scope: this
                    };
                    if (this.showFx.fxName == "fadeIn") {
                        delete listeners.beforeanimate;
                        this.el.setOpacity(0, false);
                    }
                    Ext.fx.Manager.getFxQueue(this.el.dom.id || Ext.id(this.el.dom))[0].on(listeners);
                },
                beforeAnimate: function() {
                    this.el.setDisplayed(true);
                },
                _afterShow: function() {
                    this._showing = false;
                    if (this._closed) {
                        this.destroy();
                        return;
                    }
                    this.toFront();
                    if (this.shadow) {
                        this.el.enableShadow(true);
                        this.syncShadow();
                    }
                    this.onShowComplete();
                },
                onHide: function() {
                    if (this._closed) {
                        return;
                    }
                    if (Ext.isArray(this.hideFx.args) && this.hideFx.args.length > 0) {
                        this.hideFx.args[this.hideFx.args.length - 1] = Ext.apply(this.hideFx.args[this.hideFx.args.length - 1], {
                            listeners: {
                                afteranimate: this._hide,
                                scope: this
                            }
                        });
                    } else {
                        this.hideFx.args = [{
                            listeners: {
                                afteranimate: this._hide,
                                scope: this
                            }
                        }];
                    }
                    this.el[this.hideFx.fxName].apply(this.el, this.hideFx.args);
                },
                _hide: function() {
                    this.hidden = true;
                    this.el.hide();
                    this.afterHide();
                    this.fireEvent('close', this);
                    this.destroy();
                }
            });
            if (removeHeight) {
                delete config.height;
            }
            config.cls = config.cls || "";
            config.cls += " x-notification";
            if (config.closeVisible) {
                for (var i = notifications.length - 1; i >= 0; i--) {
                    notifications[i]._closed = true;
                    if (!notifications[i]._showing) {
                        notifications[i].destroy();
                    }
                }
                notifications = [];
            }
            var w = new Ext.window.Window(config),
                mOver = function(e, t) {
                    if (!this.pinned) {
                        this.hideTask.cancel();
                        this.delayed = true;
                    }
                },
                mOut = function(e, t) {
                    if (!this.pinned) {
                        this.hideTask.delay(this.hideDelay);
                        this.delayed = false;
                    }
                };
            w.on("render", function() {
                if (this.autoHide) {
                    this.el.on("mouseover", mOver, this);
                    this.el.on("mouseout", mOut, this);
                    if (this.header && this.tools.close) {
                        this.tools.close.hide();
                    }
                }
                if (this.contentEl) {
                    Ext.fly(this.contentEl).removeCls("x-hide-offsets");
                }
            }, w);
            w.afterRender = Ext.Function.createSequence(w.afterRender, function() {
                if (this.showPin) {
                    this.pin = function(e, toolEl, owner, tool) {
                        this.tools.unpin.hide();
                        this.tools.pin.show();
                        this.hideTask.cancel();
                        this.pinned = true;
                    };
                    this.unpin = function(e, toolEl, owner, tool) {
                        this.tools.pin.hide();
                        this.tools.unpin.show();
                        this.hide();
                        this.pinned = false;
                    };
                    this.addTool({
                        type: "unpin",
                        itemId: "unpin",
                        handler: this.pin,
                        hidden: this.pinned,
                        hideMode: "display",
                        scope: this
                    });
                    this.addTool({
                        type: "pin",
                        itemId: "pin",
                        handler: this.unpin,
                        hidden: !this.pinned,
                        hideMode: "display",
                        scope: this
                    });
                }
            });
            w.focus = Ext.emptyFn;
            w.afterShow = Ext.Function.createSequence(w.afterShow, function() {
                if (this.pinEvent !== "none") {
                    this.el.on(this.pinEvent, this.stopHiding, this);
                    this.on(this.pinEvent, this.stopHiding, this);
                }
                if (this.autoHide && !this.delayed && !this.pinned) {
                    this.hideTask.delay(this.hideDelay);
                }
            });
            w.on("beforedestroy", function() {
                for (var i = 0; i < notifications.length; i++) {
                    if (notifications[i].id == this.id) {
                        notifications.splice(i, 1);
                        break;
                    }
                }
                if (this.contentEl) {
                    var ce = Ext.get(this.contentEl),
                        el = Ext.net.ResourceMgr.getAspForm() || Ext.getBody();
                    ce.addCls("x-hidden");
                    el = el.dom;
                    el.appendChild(ce.dom);
                }
                if (this.initialConfig.id) {
                    window[this.initialConfig.id] = undefined;
                }
            }, w);
            if (config.autoHide) {
                w.hideTask = new Ext.util.DelayedTask(w.hide, w);
            }
            w.on("beforehide", function() {
                this.el.disableShadow();
            }, w);
            w.show();
            return w;
        }
    };
}();
Ext.MessageBox.notify = Ext.net.Notification.notify;

Ext.layout.ContextItem.override({
    flushAnimations: function() {
        var target = this.target,
            index, width, height, clear, ct = target.ownerCt,
            items, config = target.notificationAnimationConfig;
        if (target.isNotification && config && ct) {
            items = target.queue.getItems(true);
            target.getLayout().animate = target.queue.fx.show;
            index = items.length - 2;
            if (config.x === true) {
                width = this.props["width"] || target.getWidth();
                config.x = (index >= 0 ? items[index].el.getBox(false, true).right : 0) - width;
            }
            if (config.y === true) {
                height = this.props["height"] || target.getHeight();
                config.y = (index >= 0 ? items[index].el.getBox(false, true).bottom : 0) - height;
            }
            if (target.queue.fx.show && target.queue.fx.show.opacity) {
                config.opacity = 0;
                this.props["opacity"] = 1;
            }
            this.previousSize = config;
            clear = true;
        }
        this.callParent(arguments);
        if (clear) {
            target.getLayout().animate = target.queue.fx.slideBack;
            delete target.notificationAnimationConfig;
            delete this.previousSize.opacity;
            delete this.props["opacity"];
        }
    }
});
Ext.define('Ext.net.InfoPanelQueue', {
    extend: "Ext.util.Observable",
    addToEnd: true,
    sliding: true,
    vertical: true,
    offsetX: 20,
    offsetY: 20,
    spacing: 10,
    animateOpacity: true,
    defaultType: "infopanel",
    statics: {
        queues: {},
        noneQueue: {
            items: [],
            removeAll: function(animate) {
                var items = this.items,
                    item, i, len;
                this.items = [];
                for (i = 0, len = items.length; i < len; i++) {
                    item = item[i];
                    if (!item.hidden && item.rendered && animate !== false) {
                        item.destroy();
                    } else {
                        item.destroy(false);
                    }
                }
            }
        }
    },
    constructor: function(config) {
        config = config || {};
        if (config.animate === undefined) {
            config.animate = Ext.isBoolean(this.animate) ? this.animate : Ext.enableFx;
        }
        this.enableAnimations = config.animate;
        delete config.animate;
        this.addEvents("beforeadd", "add", "remove");
        this.callParent([config]);
        Ext.net.InfoPanelQueue.queues[this.name] = this;
        this.initQueue();
    },
    initQueue: function() {
        if (!this.container) {
            this.initItems();
            Ext.EventManager.onWindowResize(this.align, this, {
                buffer: 200
            });
        }
        if (this.slideTo == "right" || this.slideTo == "left") {
            this.vertical = false;
        }
        Ext.net.InfoPanelQueue.queues[this.name] = this;
        this.fx = Ext.merge(this.getDefaultFx(), this.fx || {});
        if (!this.alignment) {
            this.alignment = "tr-tr";
        }
        if (!this.container) {
            this.calculateItemAlign();
        }
    },
    calculateItemAlign: function() {
        var reverse, alignParts, ea0, ea1, elen;
        this.itemAnchor = "";
        reverse = this.isReverseSlide();
        alignParts = this.alignment.split("-");
        elen = alignParts[0].length;
        ea0 = alignParts[0].charAt(0);
        ea1 = elen == 2 ? alignParts[0].charAt(1) : alignParts[0].charAt(0);
        if (this.vertical) {
            this.itemAnchor = (reverse ? "t" : "b") + (elen == 2 ? ea1 : "");
        } else {
            this.itemAnchor = elen == 2 ? (ea0 + (reverse ? "l" : "r")) : ea0;
        }
        this.itemAnchor += "-" + this.itemAnchor;
        this.alignOffset = [(elen == 2 ? (ea1 == "r" ? -1 : 1) : (ea0 == "r" ? -1 : (ea0 == "l" ? 1 : 0))) * this.offsetX, (ea0 == "t" ? 1 : (ea0 == "b" ? -1 : 0)) * this.offsetY];
    },
    getNotificationId: function(n) {
        return n.getItemId && n.getItemId();
    },
    getDefaultFx: function() {
        return {
            show: {
                easing: 'easeIn',
                duration: 500,
                opacity: this.animateOpacity
            },
            hide: {
                duration: 500,
                opacity: this.animateOpacity
            },
            slideBack: {
                duration: 500
            }
        };
    },
    initItems: function() {
        var i, items = this.items;
        this.items = new Ext.util.AbstractMixedCollection(false, this.getNotificationId);
        if (items) {
            if (!Ext.isArray(items)) {
                items = [items];
            }
            this.add(items);
        }
    },
    applyDefaults: function(config) {
        var i, defaults = this.defaults;
        if (defaults) {
            if (Ext.isArray(config)) {
                for (i = 0; i < config.length; i++) {
                    config[i] = this.applyDefaults(config[i]);
                }
                return config;
            }
            Ext.applyIf(config, defaults);
        }
        return config;
    },
    lookupComponent: function(comp) {
        return (typeof comp == 'string') ? Ext.ComponentManager.get(comp) : Ext.ComponentManager.create(comp, this.defaultType);
    },
    initNotification: function(item) {
        if (!item.queue) {
            item.queue = this;
        }
        if (!this.container) {
            this.fireEvent("beforeadd", this, item);
            this.initAlignEl();
            item.hideMode = "offsets";
            item = this.applyDefaults(item);
            item = this.lookupComponent(item);
            this.addToEnd ? this.items.add(item) : this.items.insert(0, item);
            this.fireEvent("add", this, item);
            if (item.rendered) {
                this.onItemRender(item);
                this.onAfterItemRender(item);
            } else {
                item.on("render", this.onItemRender, this, {
                    single: true
                });
                item.on("afterrender", this.onAfterItemRender, this, {
                    single: true
                });
            }
            item.on("destroy", this.align, this);
            item.on("hide", this.onItemHide, this);
            item.on("beforeshow", this.onItemBeforeShow, this);
            item.on("show", this.align, this);
            item.on("resize", this.align, this, {
                buffer: 200
            });
        } else if (this.enableAnimations) {
            var vertical = this.vertical,
                c = {};
            if (this.sliding) {
                if (vertical) {
                    c.y = true;
                } else {
                    c.x = true;
                }
            }
            item.notificationAnimationConfig = c;
        }
        return item;
    },
    initContainer: function() {
        if (!this.container.rendered) {
            this.container.on("afterrender", this.initContainer, this, {
                single: true
            });
            return;
        }
        var vertical = this.vertical,
            l = this.container.getLayout(),
            i;
        this.vertical = vertical = (l.names && l.names.x) == "y";
        if (this.enableAnimations) {
            l.animatePolicy = this.animateOpacity ? {
                opacity: true
            } : {};
            if (this.sliding) {
                l.animatePolicy[vertical ? "y" : "x"] = true;
            }
        }
        if (this.container.items.length) {
            for (i = 0; i < this.container.items.length; i++) {
                this.initNotification(this.container.items.getAt(i));
            }
        }
        this.container.on("beforeadd", this.onBeforeAdd, this);
        this.container.addCls("x-infopanel-container");
        this.container.defaultType = this.defaultType;
        this.initContainer = Ext.emptyFn;
    },
    onBeforeAdd: function(container, item) {
        this.initNotification(item);
    },
    onItemRender: function(item) {
        if (!this.container) {
            item.el.getXY = item._getXY;
            item.el.setX(-10000);
            if (this.fx.show.opacity) {
                item.el.setOpacity(0);
            }
        }
    },
    initAlignEl: function() {
        if (!this.alignmentEl && !this.container) {
            this.alignmentEl = Ext.getBody();
        } else {
            this.alignmentEl = Ext.get(this.alignmentEl);
        }
        this.initAlignEl = Ext.emptyFn;
    },
    onAfterItemRender: function(item) {
        if (!item.hidden) {
            this.initItemAlign(item);
            this.align();
        }
    },
    onItemHide: function(item) {
        if (!item._destroyAfterHide) {
            this.align();
        }
    },
    onItemBeforeShow: function(item) {
        var _hidden = item.hidden;
        if (this.fx.show.opacity) {
            item.el.setOpacity(0);
        }
        item._includeToVisible = true;
        this.initItemAlign(item);
        delete item._includeToVisible;
    },
    initItemAlign: function(item) {
        var reverse = this.isReverseSlide(),
            vertical = this.vertical,
            el, align, xy, items = this.getItems(true),
            itemIndex = Ext.Array.indexOf(items, item),
            itemOffset;
        if (items.length > 1 && itemIndex > 0 && this.addToEnd) {
            el = items[itemIndex - 1];
            align = this.itemAnchor;
            itemOffset = [0, 0];
            el.el._xy = el._xy;
            xy = item.getAlignToXY(el, align, itemOffset);
            delete el.el._xy;
        } else {
            el = this.alignmentEl;
            align = this.alignment;
            itemOffset = [this.alignOffset[0], this.alignOffset[1]];
            if (vertical) {
                itemOffset[1] = (reverse ? 1 : -1) * (item.getHeight())
            } else {
                itemOffset[0] = (reverse ? 1 : -1) * (item.getWidth())
            }
            xy = item.getAlignToXY(el, align, itemOffset);
        }
        item.setXY(xy, false);
        if (item.el) {
            item.el.dom.style.visibility = "";
        }
        item._xy = xy;
    },
    isReverseSlide: function() {
        if (!this.slideTo) {
            var vertical = this.vertical;
            this.slideTo = vertical ? "left" : "up";
            if (vertical && this.addToEnd && Ext.net.StringUtils.startsWith(this.alignment, "t")) {
                this.slideTo = vertical ? "right" : "down";
            } else if (!vertical && this.addToEnd && (Ext.net.StringUtils.startsWith(this.alignment, "l") || Ext.net.StringUtils.startsWith(this.alignment, "bl") || Ext.net.StringUtils.startsWith(this.alignment, "tl"))) {
                this.slideTo = vertical ? "right" : "down";
            }
        }
        return this.slideTo == "up" || this.slideTo == "left";
    },
    add: function(items) {
        var i, len, item;
        if (this.container) {
            if (this.container && Ext.isString(this.container)) {
                this.container = Ext.net.ResourceMgr.getCmp(this.container);
            }
            if (this.container) {
                this.initContainer();
            }
            this.fireEvent("beforeadd", this, items);
            items = this.applyDefaults(items);
            items = this.addToEnd ? this.container.add(items) : this.container.insert(0, items);
            this.fireEvent("add", this, items);
            return items;
        }
        if (!Ext.isArray(items)) {
            items = [items];
        }
        for (i = 0, len = items.length; i < len; i++) {
            item = items[i];
            items[i] = this.initNotification(item);
        }
        return items.length == 1 ? items[0] : items;
    },
    remove: function(item, animate) {
        if (!item.hidden && item.rendered && animate !== false) {
            item.destroy();
        } else {
            if (this.container) {
                this.container.remove(item);
            } else {
                this.items.remove(item);
                this.align();
            }
            this.fireEvent("remove", this, item);
        }
    },
    removeAll: function(animate) {
        var items = this.container ? this.container.items : this.items,
            item, align, i, len;
        for (i = 0, len = items.length; i < len; i++) {
            item = item.getAt(i);
            if (!item.hidden && item.rendered && animate !== false) {
                item.destroy();
            } else {
                if (this.container) {
                    this.container.remove(item);
                } else {
                    align = true;
                }
                this.fireEvent("remove", this, item);
            }
        }
        if (align) {
            this.items.removeAll();
            this.align();
        }
    },
    getItems: function(visible) {
        var i, len, item, allItems = this.container ? this.container.items : this.items,
            items = [];
        for (i = 0, len = allItems.length; i < len; i++) {
            item = allItems.getAt(i);
            if (((visible && !item.hidden) || !visible || item._includeToVisible) && item.el && item.el.dom) {
                items.push(item);
            }
        }
        return items;
    },
    align: function() {
        if (this.container) {
            this.container.doLayout();
            return;
        }
        var i, len, item, prevItem, x, y, xy, anim, config, items, reverse = this.isReverseSlide();
        items = this.getItems(true);
        for (i = 0, len = items.length; i < len; i++) {
            item = items[i];
            if (!item.el || !item.el.dom) {
                continue;
            }
            if (i == 0) {
                xy = item.getAlignToXY(this.alignmentEl, this.alignment, this.alignOffset);
            } else {
                prevItem = items[i - 1];
                if (prevItem.el && prevItem.el.dom) {
                    prevItem.el._xy = prevItem._xy;
                    xy = item.getAlignToXY(prevItem, this.itemAnchor, [this.vertical ? 0 : ((reverse ? -1 : 1) * (item.getWidth() + this.spacing)), this.vertical ? ((reverse ? -1 : 1) * (item.getHeight() + this.spacing)) : 0]);
                    delete prevItem.el._xy;
                } else {
                    xy = item.getAlignToXY(this.alignmentEl, this.alignment, this.alignOffset);
                }
            }
            if (item._xy[0] != xy[0] || item._xy[1] != xy[1]) {
                if (this.enableAnimations) {
                    item.stopAnimation();
                    if (!item.el || !item.el.dom) {
                        continue;
                    }
                    if (this.vertical) {
                        anim = reverse ? (item._xy[1] > xy[1] ? "show" : "slideBack") : (item._xy[1] < xy[1] ? "show" : "slideBack");
                    } else {
                        anim = reverse ? (item._xy[0] > xy[0] ? "show" : "slideBack") : (item._xy[0] < xy[0] ? "show" : "slideBack");
                    }
                    anim = this.fx[anim];
                    config = {
                        from: {
                            x: item.getX(),
                            y: item.getY()
                        },
                        to: {
                            x: xy[0],
                            y: xy[1]
                        },
                        duration: anim.duration,
                        dynamic: true
                    };
                    config.to.opacity = 1;
                    if (anim.easing) {
                        config.easing = anim.easing;
                    }
                    item.animate(config);
                } else {
                    item.setXY(xy, false);
                }
                item._xy = xy;
            }
        }
    }
}, function() {
    this.defaultQueue = new this({
        name: "default"
    });
    new this({
        name: "topright",
        alignment: "tr-tr",
        vertical: true,
        slideTo: "down"
    });
    new this({
        name: "topleft",
        alignment: "tl-tl",
        vertical: true,
        slideTo: "down"
    });
    new this({
        name: "top",
        alignment: "t-t",
        vertical: true,
        slideTo: "down"
    });
    new this({
        name: "bottomright",
        alignment: "br-br",
        vertical: true,
        slideTo: "up"
    });
    new this({
        name: "bottomleft",
        alignment: "bl-bl",
        vertical: true,
        slideTo: "up"
    });
    new this({
        name: "bottom",
        alignment: "b-b",
        vertical: true,
        slideTo: "up"
    });
    new this({
        name: "righttop",
        alignment: "tr-tr",
        vertical: false,
        slideTo: "left"
    });
    new this({
        name: "rightbottom",
        alignment: "br-br",
        vertical: false,
        slideTo: "left"
    });
    new this({
        name: "right",
        alignment: "r-r",
        vertical: false,
        slideTo: "left"
    });
    new this({
        name: "lefttop",
        alignment: "tl-tl",
        vertical: false,
        slideTo: "right"
    });
    new this({
        name: "leftbottom",
        alignment: "bl-bl",
        vertical: false,
        slideTo: "right"
    });
    new this({
        name: "left",
        alignment: "l-l",
        vertical: false,
        slideTo: "right"
    });
    new this({
        name: "center",
        alignment: "c-c",
        vertical: true,
        slideTo: "down"
    });
});
Ext.define('Ext.net.InfoPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.infopanel',
    bodyCls: "x-infopanel-body",
    minWidth: 200,
    isNotification: true,
    shadow: false,
    autoHide: false,
    pinEvent: "none",
    hideDelay: 7000,
    showPin: false,
    pinned: false,
    bringToFront: true,
    focusOnToFront: false,
    textAlign: 'left',
    statics: {
        info: function(title, html, queue) {
            var config;
            if (arguments.length == 1 && Ext.isObject(title)) {
                config = title;
            } else {
                config = {};
                config.title = title;
                config.html = html;
                config.queue = queue;
            }
            config.isFloatingInfo = true;
            if (config.floating !== false && !Ext.isDefined(config.autoHide)) {
                config.autoHide = true;
            }
            if (!config.alignmentEl && config.floating !== false) {
                if (!config.queue) {
                    config.queue = Ext.net.InfoPanelQueue.defaultQueue;
                }
                if (Ext.isString(config.queue)) {
                    config.queue = Ext.net.InfoPanelQueue.queues[config.queue];
                }
                return config.queue.add(config);
            } else {
                return Ext.create("Ext.net.InfoPanel", config);
            }
        }
    },
    initComponent: function() {
        var noqueue = false;
        this.addCls("x-infopanel");
        this.afterHideAnimate = Ext.Function.bind(this.afterHideAnimate, this);
        if (!this.alignmentEl && this.initialConfig.floating !== false && this.isFloatingInfo) {
            if (!this.queue) {
                this.queue = Ext.net.InfoPanelQueue.defaultQueue;
                noqueue = true;
            }
            if (Ext.isString(this.queue)) {
                this.queue = Ext.net.InfoPanelQueue.queues[this.queue];
            }
            if (noqueue && this.queue && !this.queue.container) {
                this.queue.add(this);
            }
        } else {
            delete this.queue;
            if (this.alignmentEl) {
                this.alignmentEl = Ext.get(this.alignmentEl);
            }
        }
        if ((this.alignmentEl || !this.queue || !this.queue.container) && this.initialConfig.floating !== false && this.isFloatingInfo) {
            this.floating = true;
            this.renderTo = Ext.getBody();
        }
        if (this.ui && this.ui != "default") {
            this.nui = this.ui;
            this.addCls("x-infopanel-" + this.ui);
            this.ui = "default";
        }
        if (this.floating) {
            this.addCls("x-infopanel-floating");
        }
        if (this.iconCls) {
            this.addCls("x-infopanel-icon");
        }
        this.callParent(arguments);
        if (noqueue && this.queue && this.queue.container) {
            this.queue.add(this);
        }
    },
    _getXY: function() {
        if (this._xy) {
            return this._xy;
        }
        return Ext.dom.Element.prototype.getXY.call(this);
    },
    hide: function(animate) {
        var me = this,
            config, hideFx = this.queue && this.queue.fx.hide;
        if (this._parentHide || animate === false) {
            delete this._parentHide;
            this.wasHidden = true;
            this.callParent(arguments);
            return this;
        }
        if (this._hiding) {
            return this;
        }
        if (hideFx && this.queue && this.queue.enableAnimations) {
            this._hiding = true;
            if (this.rendered) {
                config = {
                    duration: hideFx.duration,
                    listeners: {
                        afteranimate: this.afterHideAnimate
                    }
                };
                if (hideFx.easing) {
                    config.easing = hideFx.easing;
                }
                if (hideFx.opacity) {
                    config.to = {
                        opacity: 0
                    };
                }
                this.el.animate(config);
            }
        } else {
            if (this.alignmentEl) {
                this.animateHide();
                return;
            }
            if (this._destroyAfterHide) {
                this.destroy(false);
            } else {
                this.callParent(arguments);
            }
        }
        return this;
    },
    afterHideAnimate: function() {
        var me = this;
        if (me._destroyAfterHide) {
            me.destroy(false);
        } else {
            delete me._hiding;
            me._parentHide = true;
            me.hide();
            me.el.setOpacity(1, false);
        }
    },
    destroy: function(animate) {
        if (!this.hidden && this.rendered && animate !== false) {
            this._destroyAfterHide = true;
            this.hide();
        } else {
            if (this.queue) {
                this.queue.remove(this, animate);
                delete this.queue;
            } else {
                Ext.Array.remove(Ext.net.InfoPanelQueue.noneQueue.items, this);
            }
            if (this.hideTask) {
                this.hideTask.cancel();
            }
            this.callParent(arguments);
        }
    },
    stopHiding: function() {
        if (this.header && this.showPin) {
            this.pin();
        } else {
            this.pinned = true;
            if (this.autoHide) {
                this.hideTask.cancel();
            }
        }
    },
    onRender: function() {
        this.callParent(arguments);
        this.body.addCls("x-infopanel-body-" + this.textAlign);
        if (this.bringToFront && this.floating) {
            this.toFront();
        }
        if (this.alignmentEl) {
            this.x = -10000;
        }
        if (this.autoHide) {
            this.hideTask = new Ext.util.DelayedTask(this.destroy, this);
            this.el.hover(this.onOver, this.onOut, this);
        }
        if (this.header) {
            this.header.addCls("x-infopanel-header x-panel-header-light");
        }
    },
    animateShow: function() {
        this.el.setOpacity(0, false);
        this.el.fadeIn();
    },
    animateHide: function() {
        this.el.fadeOut({
            listeners: {
                afteranimate: this.afterHideAnimate
            }
        });
    },
    restartHideTask: function() {
        if (this.hideTask) {
            this.hideTask.cancel();
            this.hideTask.delay(this.hideDelay);
            this.delayed = false;
        }
    },
    onOver: function() {
        if (!this.pinned) {
            this.hideTask.cancel();
            this.delayed = true;
        }
    },
    onOut: function() {
        if (!this.pinned) {
            this.hideTask.delay(this.hideDelay);
            this.delayed = false;
        }
    },
    pin: function(e, toolEl, owner, tool) {
        this.tools.unpin.hide();
        this.tools.pin.show();
        this.hideTask.cancel();
        this.pinned = true;
    },
    unpin: function(e, toolEl, owner, tool) {
        this.tools.pin.hide();
        this.tools.unpin.show();
        this.destroy();
        this.pinned = false;
    },
    afterLayout: function() {
        this.callParent(arguments);
        if (this.alignmentEl && !this._aligned) {
            this._aligned = true;
            var xy = this.getAlignToXY(this.alignmentEl, this.alignment || "tr-tr", [this.offsetX || 0, this.offsetY || 0]);
            this.x = xy[0];
            this.y = xy[1];
            this.setXY(xy);
            this.animateShow();
        }
    },
    afterRender: function() {
        this.callParent(arguments);
        if (this.showPin) {
            this.addTool({
                type: "unpin",
                itemId: "unpin",
                handler: this.pin,
                hidden: this.pinned,
                hideMode: "display",
                scope: this
            });
            this.addTool({
                type: "pin",
                itemId: "pin",
                handler: this.unpin,
                hidden: !this.pinned,
                hideMode: "display",
                scope: this
            });
        }
        if (this.pinEvent !== "none") {
            this.el.on(this.pinEvent, this.stopHiding, this);
            this.on(this.pinEvent, this.stopHiding, this);
        }
        if (this.autoHide && !this.delayed && !this.pinned) {
            this.hideTask.delay(this.hideDelay);
        }
    },
    setUI: function(ui) {
        if (ui == "default") {
            this.callParent(arguments);
            return;
        }
        if (this.nui) {
            this.removeCls("x-infopanel-" + this.nui);
        }
        this.nui = ui;
        if (this.nui) {
            this.addCls("x-infopanel-" + this.nui);
        }
    }
});
Ext.MessageBox.info = Ext.net.InfoPanel.info;

Ext.define('Ext.net.Badge', {
    extend: "Ext.util.Observable",
    alias: 'plugin.badge',
    badgeTextCls: "x-badge-text",
    badgeNumberCls: "x-badge-number",
    alignment: "c-tr",
    scale: "small",
    hideEmpty: true,
    statics: {
        show: function(cmp, config) {
            if (Ext.isString(cmp)) {
                cmp = Ext.getCmp(cmp);
            }
            if (cmp.badge) {
                if (!Ext.isDefined(config)) {
                    cmp.badge.show();
                    return cmp.badge;
                }
                if (!Ext.isObject(config)) {
                    cmp.badge.setHtml(config);
                    cmp.badge.show();
                    return cmp.badge;
                }
                Ext.Array.remove(cmp.plugins, cmp.badge);
                cmp.badge.destroy();
            }
            if (!Ext.isObject(config)) {
                config = {
                    text: config
                };
            }
            var badge = Ext.create('Ext.net.Badge', config);
            cmp.addPlugins(badge);
            return badge;
        },
        hide: function(cmp) {
            if (Ext.isString(cmp)) {
                cmp = Ext.getCmp(cmp);
            }
            if (cmp.badge) {
                cmp.badge.hide();
                return cmp.badge;
            }
        }
    },
    constructor: function(config) {
        Ext.apply(this, config);
        this.addEvents("click", "dblclick", "show", "hide", "change", "mouseover", "mouseout");
        this.callParent(arguments);
    },
    init: function(cmp) {
        this.cmp = cmp;
        this.cmp.badge = this;
        this.cmp.on({
            show: this.show,
            hide: this.hide,
            scope: this
        });
        if (this.text) {
            this.html = Ext.util.Format.htmlEncode(this.text);
            delete this.text;
        }
        this.updatePosition = Ext.Function.createBuffered(this.realUpdatePosition, 100, this);
        if (cmp.rendered) {
            this.initPlugin();
        } else {
            cmp.on("afterrender", this.initPlugin, this, {
                single: true,
                delay: 100
            });
        }
    },
    getTargetEl: function() {
        var targetEl;
        if (this.selector) {
            targetEl = this.cmp.el.down(this.selector);
        } else {
            targetEl = this.cmp.el;
        }
        return targetEl;
    },
    getRenderTo: function() {
        return this.renderToBody !== false ? Ext.getBody() : this.targetEl.parent();
    },
    initPlugin: function() {
        this.targetEl = this.getTargetEl();
        if (this.renderToBody !== false) {
            this.floatingParent = this.cmp.up('[floating]');
            var floating = (this.floatingParent || this.cmp),
                zm = floating.zIndexManager,
                visible;
            if (zm) {
                floating.setZIndex = Ext.Function.createSequence(floating.setZIndex, function() {
                    if (this.badgeEl) {
                        Ext.Function.defer(this.updateZIndex, 10, this);
                    }
                }, this);
            }
            if (this.floatingParent && this.floatingParent.floating) {
                this.floatingParent.on("move", this.updatePosition, this);
            }
            if (floating.floating && Ext.isFunction(floating.ghost)) {
                floating.ghost = Ext.Function.createSequence(floating.ghost, function() {
                    if (this.badgeEl) {
                        this._needToShow = !this.hidden;
                        this.hide();
                    }
                }, this);
                floating.unghost = Ext.Function.createSequence(floating.unghost, function() {
                    if (this.badgeEl && this._needToShow) {
                        delete this._needToShow;
                        this.show();
                    }
                }, this);
            }
        }
        this.badgeEl = this.getRenderTo().createChild({
            tag: "div",
            cls: "x-badge" + (this.cls ? (" " + this.cls) : ""),
            style: "top:-10000px;" + this.style || "",
            children: [{
                tag: "div",
                cls: "x-badge-wrap" + (this.wrapCls ? (" " + this.wrapCls) : ""),
                style: this.wrapStyle || "",
                children: [{
                    tag: "p",
                    cls: "x-badge-inner" + (this.textCls ? (" " + this.textCls) : ""),
                    style: this.textStyle || "",
                    html: Ext.isDefined(this.html) ? this.html : ""
                }]
            }]
        });
        visible = this.cmp.isVisible();
        if (!visible) {
            this.hide();
        }
        if (this.overCls) {
            this.badgeEl.addClsOnOver(this.overCls);
        }
        this.textEl = this.badgeEl.down("p");
        this.badgeEl.unselectable();
        this.setScale(this.scale);
        if (this.ui) {
            this.setUI(this.ui);
        }
        this.setHtml(this.html);
        this.cmp.on({
            afterlayout: this.updatePosition,
            resize: this.updatePosition,
            move: this.updatePosition,
            scope: this
        });
        this.initEvents();
    },
    setScale: function(scale) {
        if (this.scale) {
            this.badgeEl.removeCls("x-badge-" + this.scale);
        }
        this.scale = scale;
        if (this.scale) {
            this.badgeEl.addCls("x-badge-" + this.scale);
        }
        this.realUpdatePosition();
    },
    setText: function(text) {
        this.setHtml(Ext.util.Format.htmlEncode(text));
    },
    setHtml: function(html) {
        var isnan, fireEvent, oldHtml;
        if (html && html.charAt) {
            if (html.charAt(0) == '+') {
                if (isNaN(html.substr(1))) {
                    html = (this.html || 0) + html.substr(1);
                } else {
                    html = Math.round(~~this.html + ~~html.substr(1));
                }
            } else if (html.charAt(0) == '-') {
                if (!isNaN(html.substr(1))) {
                    html = Math.round(~~this.html - ~~html.substr(1));
                }
            }
        }
        isnan = isNaN(html);
        fireEvent = this.html !== html;
        oldHtml = this.html;
        this.html = Ext.isDefined(html) ? html : "";
        this.textEl.dom.innerHTML = this.html;
        if (fireEvent) {
            this.fireEvent("change", this, html, oldHtml);
        }
        if (this.hideEmpty && !this.html && isnan) {
            this.hide();
            return;
        }
        if (isnan) {
            this.textEl.removeCls("x-badge-number");
            this.textEl.addCls("x-badge-text");
        } else {
            this.textEl.removeCls("x-badge-text");
            this.textEl.addCls("x-badge-number");
        }
        this.realUpdatePosition();
    },
    setUI: function(ui) {
        if (this.ui) {
            this.badgeEl.removeCls("x-badge-" + this.ui);
        }
        this.ui = ui;
        if (this.ui) {
            this.badgeEl.addCls("x-badge-" + this.ui);
        }
    },
    updateZIndex: function() {
        var cmp = this.floatingParent || this.cmp,
            z, zm, zParent = this.cmp.zIndexParent;
        if (zParent) {
            this.badgeEl.setStyle("z-index", ~~zParent.el.getStyle("z-index") + 1);
        } else {
            z = cmp.el.getStyle("z-index");
            zm = cmp.zIndexManager;
            if (z || zm) {
                this.badgeEl.setStyle("z-index", (!zm || (~~z > zm.zseed)) ? (~~z + 1) : (zm.zseed + 1));
            }
        }
    },
    realUpdatePosition: function() {
        if (this.badgeEl) {
            if (this.renderToBody !== false) {
                this.updateZIndex();
            }
            this.badgeEl.alignTo(this.targetEl, this.alignment, this.offset ? this.offset : [0, 0], false);
        }
    },
    initEvents: function() {
        this.badgeEl.on({
            mouseover: this.onMouseOver,
            mouseout: this.onMouseOut,
            click: this.onClick,
            dblclick: this.onDblClick,
            scope: this
        });
    },
    onMouseOver: function(e) {
        this.fireEvent("mouseover", this, e);
    },
    onMouseOut: function(e) {
        this.fireEvent("mouseout", this, e);
    },
    onClick: function(e) {
        this.fireEvent("click", this, e);
    },
    onDblClick: function(e) {
        this.fireEvent("dblclick", this, e);
    },
    show: function() {
        this.hidden = false;
        this.badgeEl.show();
        this.realUpdatePosition();
        this.fireEvent("show", this);
    },
    hide: function() {
        this.hidden = true;
        this.badgeEl.hide();
        this.fireEvent("hide", this);
    },
    destroy: function() {
        this.badgeEl.destroy();
        delete this.badgeEl;
        this.cmp.un({
            show: this.show,
            hide: this.hide,
            afterlayout: this.updatePosition,
            resize: this.updatePosition,
            move: this.updatePosition,
            scope: this
        });
        if (this.floatingParent) {
            this.floatingParent.un("move", this.updatePosition, this);
        }
        this.callParent(arguments);
    }
});
Ext.MessageBox.badge = function(cmp, config) {
    if (config) {
        Ext.net.Badge.show(cmp, config);
    } else {
        Ext.net.Badge.hide(cmp);
    }
};

Ext.define("Ext.net.Callout", {
    extend: "Ext.Component",
    alias: "widget.callout",
    baseCls: Ext.baseCSSPrefix + "callout",
    alignment: "right",
    hidden: true,
    constrainPosition: true,
    trigger: "click",
    quickShowInterval: 250,
    dismissDelay: 0,
    hideDelay: 0,
    showDelay: 0,
    autoHide: true,
    hideOnToggle: true,
    toolbarAlign: "tr-tr",
    toolbarOffset: [-5, 3],
    animation: true,
    closeAction: "hide",
    closeOnOutsideClick: false,
    hoverConfig: {
        hideDelay: 200,
        showDelay: 500
    },
    childEls: ["body", "header", "headerText", "arrow"],
    renderTpl: ['<div id="{id}-arrow" class="{baseCls}-arrow<tpl if="arrowCls"> {arrowCls}</tpl>"<tpl if="arrowStyle"> style="{arrowStyle}"</tpl>>', '<tpl if="Ext.isIE7m"><span class="{baseCls}-arrow-after"></span></tpl>', '</div>', '<h3 id="{id}-header" class="{baseCls}-header<tpl if="headerCls"> {headerCls}</tpl>"<tpl if="headerStyle"> style="{headerStyle}"</tpl>><span id="{id}-headerText" class="{baseCls}-header-text">{title}</span></h3>', '<div id="{id}-body" class="{baseCls}-body<tpl if="bodyCls"> {bodyCls}</tpl>"<tpl if="bodyStyle"> style="{bodyStyle}"</tpl>>{html}</div>'],
    statics: {
        show: function(target, config, forceNew) {
            if (target) {
                var isCmp = target && target.isComponent,
                    t = isCmp ? target.el : Ext.get(target),
                    calloutOwner = isCmp ? target : t,
                    callout, show;
                if (target.callouts && target.callouts.length > 0 && !forceNew) {
                    callout = target.callouts[0];
                    if (config && Ext.isDefined(config.title)) {
                        callout.setTitle(config.title);
                    }
                    if (config && Ext.isDefined(config.html)) {
                        callout.setHtml(config.html);
                    }
                    if (config && Ext.isDefined(config.iconCls)) {
                        callout.setIconCls(config.iconCls);
                    }
                    if (config && Ext.isDefined(config.alignment)) {
                        if (callout.rendered) {
                            callout.removeCls(callout.baseCls + "-" + callout.alignment);
                            callout.addCls(callout.baseCls + "-" + config.alignment);
                        }
                        callout.origalignment = config.alignment;
                        callout.alignment = config.alignment;
                    }
                    if (config && Ext.isDefined(config.animation)) {
                        callout.animation = config.animation;
                    }
                    if (config && Ext.isDefined(config.ui)) {
                        callout.setUI(config.ui);
                    }
                    callout.triggerElement = t;
                    callout.hidden = true;
                    callout.delayShow();
                } else {
                    config.target = calloutOwner;
                    if (!Ext.isDefined(config.trigger)) {
                        config.trigger = "manual";
                    }
                    if (config.trigger == "manual" && !Ext.isDefined(config.hidden)) {
                        show = true;
                    }
                    callout = Ext.create("Ext.net.Callout", config);
                    if (show) {
                        callout.triggerElement = t;
                        callout.delayShow();
                    }
                }
                return callout
            }
        },
        hide: function(target) {
            if (target) {
                var isCmp = target && target.isComponent,
                    t = isCmp ? target.el : Ext.get(target),
                    calloutOwner = isCmp ? target : t,
                    callout;
                if (target.callouts && target.callouts.length > 0) {
                    callout = target.callouts[0];
                    callout.clearTimer('show');
                    callout.triggerElement = null;
                    callout.delayHide();
                }
            }
        },
        destroy: function(target) {
            if (target) {
                var isCmp = target && target.isComponent,
                    t = isCmp ? target.el : Ext.get(target),
                    calloutOwner = isCmp ? target : t,
                    callout;
                if (target.callouts && target.callouts.length > 0) {
                    callout = target.callouts[0];
                    callout.destroy();
                }
            }
        }
    },
    constructor: function(config) {
        if (config && config.hoverConfig) {
            Ext.apply(this.hoverConfig, config.hoverConfig);
            delete config.hoverConfig;
        }
        if (config && Ext.isDefined(config.hidden)) {
            this.hasConfigHidden = true;
        }
        this.callParent([config]);
    },
    initRenderData: function() {
        return Ext.applyIf(this.callParent(), {
            title: this.title || "",
            html: this.html || "",
            arrowCls: this.arrowCls,
            arrowStyle: this.arrowStyle,
            headerCls: this.headerCls,
            headerStyle: this.headerStyle,
            bodyCls: this.bodyCls,
            bodyStyle: this.bodyStyle
        });
    },
    initComponent: function() {
        var me = this,
            target;
        this.addEvents("beforealign");
        me.lastActive = new Date();
        me.detectFocusInGecko = Ext.Function.bind(me.detectFocusInGecko, me);
        if (me.target) {
            if (!me.renderTo) {
                me.renderTo = Ext.getBody();
                Ext.WindowManager.register(me);
                me.renderedToBody = true;
            }
            if (me.target.isComponent && !me.target.rendered) {
                me.target.on("afterrender", function() {
                    target = me.target;
                    delete me.target;
                    me.setTarget(target);
                }, me);
            } else {
                target = me.target;
                delete me.target;
                me.setTarget(target);
            }
        } else {
            if (!this.hasConfigHidden) {
                this.hidden = false;
            }
            this.animation = false;
            this.addCls(this.baseCls + "-" + this.alignment);
        }
        me.origalignment = me.alignment;
        me.callParent(arguments);
    },
    onRender: function() {
        this.callParent(arguments);
        if (!this.target) {
            this.el.setStyle("position", "relative");
        }
        if (this.noArrow) {
            this.arrow.setDisplayed(false);
        }
        if (this.maxWidth) {
            this.el.setStyle("maxWidth", this.maxWidth + "px");
        }
        this.setTitle(this.title);
        if (this.headerToolbar) {
            this.createHeaderToolbar();
        }
        if (this.bodyWidget) {
            this.createBodyWidget();
        }
        if (this.iconCls) {
            this.setIconCls(this.iconCls);
        }
        if (this.glyph) {
            var glyph = this.glyph;
            delete this.glyph;
            this.setGlyph(glyph);
        }
    },
    setIconCls: function (cls) {        
        if (this.iconCls) {
            this.header.removeCls(this.iconCls);
        }
        this.iconCls = cls && cls.indexOf('#') === 0 ? X.net.RM.getIcon(cls.substring(1)) : cls;
        if (this.iconCls) {
            this.header.addCls("x-callout-header-icon");
            this.header.addCls(this.iconCls);
        } else {
            this.header.removeCls("x-callout-header-icon");
        }
    },
    renderGlyphEl: function() {
        this.glyphEl = Ext.core.DomHelper.insertFirst(this.header, {
            tag: "span",
            cls: "x-callout-glyph",
            unselectable: "on"
        }, true);
        this.glyphEl.on("click", function(e, t) {
            this.fireEvent("glyphclick", this, e, t);
        }, this);
        return this.glyphEl;
    },
    setGlyph: function(glyph) {
        glyph = glyph || 0;
        var me = this,
            glyphEl = me.glyphEl,
            oldGlyph = me.glyph,
            fontFamily, glyphParts;
        me.glyph = glyph;
        if (!glyphEl) {
            glyphEl = this.renderGlyphEl();
        }
        if (typeof glyph === 'string') {
            glyphParts = glyph.split('@');
            glyph = glyphParts[0];
            fontFamily = glyphParts[1] || Ext._glyphFontFamily;
        }
        if (!glyph) {
            glyphEl.dom.innerHTML = '';
        } else if (oldGlyph != glyph) {
            glyphEl.dom.innerHTML = '&#' + glyph + ';';
        }
        if (fontFamily) {
            glyphEl.setStyle('font-family', fontFamily);
        }
        this.header.addCls("x-callout-glyph-" + (this.glyphScale || "small"));
        return me;
    },
    setTarget: function(target, eventTarget) {
        var me = this,
            isCmp = target && target.isComponent,
            t = isCmp ? target.el : Ext.get(target),
            calloutOwner = isCmp ? target : t,
            tg;
        if (this.eventSelector) {
            eventTarget = t.down(this.eventSelector);
        }
        if (this.selector) {
            t = t.down(this.selector);
        }
        if (!eventTarget && isCmp) {
            if (target.inputEl) {
                eventTarget = target.inputEl;
                t = target.inputRow;
            }
        }
        if (me.eventTarget) {
            tg = Ext.get(me.eventTarget);
            me.mun(tg, 'mouseover', me.onTargetOver, me);
            me.mun(tg, 'mouseout', me.onTargetOut, me);
            me.mun(tg, 'mousemove', me.onMouseMove, me);
        }
        if (me.focusInInterval) {
            clearInterval(me.focusInInterval);
        }
        if (isCmp && me.checkDomInterval) {
            clearInterval(me.checkDomInterval);
        }
        if (!isCmp) {
            me.checkDomInterval = setInterval(Ext.Function.bind(this.checkDom, this), 10000);
        }
        if (!calloutOwner.callouts) {
            calloutOwner.callouts = [];
        }
        calloutOwner.callouts.push(this);
        me.target = t;
        me.calloutOwner = calloutOwner;
        me.eventTarget = eventTarget || t;
        if (t) {
            if (me.trigger == "hover") {
                Ext.apply(this, this.hoverConfig);
                me.mon(me.eventTarget, {
                    freezeEvent: true,
                    mouseover: me.onTargetOver,
                    mouseout: me.onTargetOut,
                    mousemove: me.onMouseMove,
                    scope: me
                });
            } else if (me.trigger == "click") {
                me.mon(me.eventTarget, {
                    click: me.onTargetClick,
                    scope: me
                });
            } else if (me.trigger == "focus") {
                if (this.delegate && Ext.isGecko) {
                    me.focusInInterval = setInterval(me.detectFocusInGecko, 200);
                } else if (this.delegate && Ext.isIE) {
                    me.mon(me.eventTarget, {
                        focusin: me.onTargetFocus,
                        focusout: me.onTargetBlur,
                        scope: me
                    });
                } else {
                    me.mon(me.eventTarget, {
                        focus: me.onTargetFocus,
                        blur: me.onTargetBlur,
                        scope: me
                    });
                }
            }
            if (this.hidden === false) {
                this.triggerElement = t;
                this.delayShow();
            }
        }
    },
    detectFocusInGecko: function() {
        if (document.activeElement != this.lastActiveElement) {
            var obj = new Ext.EventObjectImpl();
            if (this.lastActiveElement) {
                obj.target = this.lastActiveElement;
                this.lastActiveElement = null;
                this.onTargetBlur(obj);
            }
            if (this.eventTarget.contains(document.activeElement)) {
                this.lastActiveElement = document.activeElement;
                obj.target = this.lastActiveElement;
                this.onTargetFocus(obj);
            }
        }
    },
    createHeaderToolbar: function() {
        this.headerToolbar.floating = true;
        this.headerToolbar.shadow = false;
        this.headerToolbar.renderTo = this.el;
        this.headerToolbar = Ext.ComponentManager.create(this.headerToolbar, "toolbar");
        this.headerToolbar.callout = this;
    },
    createBodyWidget: function() {
        this.bodyWidget.renderTo = this.body;
        this.bodyWidget = Ext.ComponentManager.create(this.bodyWidget, "container");
        this.bodyWidget.callout = this;
        this.body.addCls(this.baseCls + "-body-widget");
    },
    doAlign: function() {
        if (this.target) {
            this.checkConstrain();
            var offset = this.getOffset(),
                align = this.getAlign(offset),
                config;
            config = {
                el: this.delegate ? this.triggerElement : this.target,
                alignment: this.alignment,
                align: align,
                offset: offset
            };
            this.fireEvent("beforealign", this, config);
            this.addCls(this.baseCls + "-" + config.alignment);
            this.el.alignTo(config.el, config.align, config.offset);
            this.toFront(true);
        }
    },
    doHeaderToolbarAlign: function() {
        if (this.headerToolbar) {
            this.headerToolbar.el.alignTo(this.el, this.toolbarAlign, this.toolbarOffset);
        }
    },
    getAlign: function() {
        if (this.alignment == "left") {
            return "r-l";
        } else if (this.alignment == "right") {
            return "l-r";
        } else if (this.alignment == "top") {
            return "b-t";
        } else if (this.alignment == "bottom") {
            return "t-b";
        } else if (this.alignment == "topleft") {
            return "bl-tl";
        } else if (this.alignment == "topright") {
            return "br-tr";
        } else if (this.alignment == "bottomright") {
            return "tr-br";
        } else if (this.alignment == "bottomleft") {
            return "tl-bl";
        } else if (this.alignment == "lefttop") {
            return "tr-tl";
        } else if (this.alignment == "leftbottom") {
            return "br-bl";
        } else if (this.alignment == "righttop") {
            return "tl-tr";
        } else if (this.alignment == "rightbottom") {
            return "bl-br";
        }
    },
    checkConstrain: function() {
        var me = this,
            offsets, parent, isBody, xy, dw, dh, de, bd, scrollX, scrollY, axy, sz, oldalignment;
        if (me.constrainPosition) {
            oldalignment = me.alignment, parent = this.el.parent(), isBody = parent == Ext.getBody(), offsets = this.getOffset();
            xy = me.getAlignToXY(this.delegate ? this.triggerElement : this.target, me.getAlign());
            dw = (isBody ? Ext.Element.getViewWidth() : parent.getViewSize().width) - 5;
            dh = (isBody ? Ext.Element.getViewHeight() : parent.getViewSize().height) - 5;
            de = document.documentElement;
            bd = document.body;
            scrollX = (de.scrollLeft || bd.scrollLeft || 0) + 5;
            scrollY = (de.scrollTop || bd.scrollTop || 0) + 5;
            axy = [xy[0] + offsets[0], xy[1] + offsets[1]];
            sz = me.getSize();
            if (Ext.net.StringUtils.startsWith(me.alignment, "left") && (axy[0] < scrollX)) {
                me.alignment = "right" + me.alignment.substring(4);
            } else if (Ext.net.StringUtils.startsWith(me.alignment, "right") && (axy[0] + sz.width > dw)) {
                me.alignment = "left" + me.alignment.substring(5);
            } else if (Ext.net.StringUtils.startsWith(me.alignment, "top") && (axy[1] < scrollY)) {
                me.alignment = "bottom" + me.alignment.substring(3);
            } else if (Ext.net.StringUtils.startsWith(me.alignment, "bottom") && (axy[1] + sz.height > dh)) {
                me.alignment = "top" + me.alignment.substring(6);
            }
            if (oldalignment && oldalignment != me.alignment) {
                this.removeCls(this.baseCls + "-" + oldalignment);
            }
        }
    },
    getOffset: function() {
        var value = this.noArrow ? 2 : 10,
            offset = [value, 0];
        if (this.alignment == "left" || this.alignment == "lefttop" || this.alignment == "leftbottom") {
            offset = [-value, 0];
        } else if (this.alignment == "right" || this.alignment == "righttop" || this.alignment == "rightbottom") {
            offset = [value, 0];
        } else if (this.alignment == "top" || this.alignment == "topleft" || this.alignment == "topright") {
            offset = [0, -value];
        } else if (this.alignment == "bottom" || this.alignment == "bottomleft" || this.alignment == "bottomright") {
            offset = [0, value];
        }
        if (this.offset) {
            offset[0] += this.offset[0];
            offset[1] += this.offset[1];
        }
        return offset;
    },
    setTitle: function(title) {
        this.title = title;
        this.headerText.dom.innerHTML = title;
        this.header.setDisplayed(!!title);
    },
    setHtml: function(html) {
        this.html = html;
        this.body.dom.innerHTML = html;
    },
    onMouseMove: function(e) {
        var me = this,
            t = me.delegate ? e.getTarget(me.delegate) : me.triggerElement = true,
            xy;
        if (t) {
            if ((t === true && me.triggerElement !== true) || (t !== true && t !== (me.triggerElement && me.triggerElement.dom))) {
                me.hide();
                me.lastActive = new Date(0);
                me.onTargetOver(e);
            }
        } else if (!me.hidden && me.autoHide !== false) {
            me.hide();
        }
    },
    hide: function() {
        var me = this;
        me.clearTimer('dismiss');
        me.lastActive = new Date();
        me.callParent(arguments);
        delete me.triggerElement;
        if (this.closeAction == "destroy") {
            this.destroy();
        }
    },
    onTargetClick: function(e) {
        var me = this,
            delegate = me.delegate,
            t;
        if (me.disabled || e.within(me.target.dom, true)) {
            return;
        }
        t = delegate ? e.getTarget(delegate) : true;
        if (t) {
            if (!this.hidden && delegate && (me.triggerElement && me.triggerElement.dom) != t) {
                this.hidden = true;
            }
            me.triggerElement = Ext.get(t);
            me.triggerEvent = e;
            me.clearTimer('hide');
            if (!this.hidden) {
                if (this.autoHide) {
                    if (me.showTimer) {
                        me.clearTimer('show');
                        me.triggerElement = null;
                    }
                    me.delayHide();
                }
            } else {
                me.delayShow();
            }
        }
    },
    onTargetFocus: function(e) {
        var me = this,
            delegate = me.delegate,
            t;
        if (me.disabled) {
            return;
        }
        t = delegate ? e.getTarget(delegate) : true;
        if (t) {
            me.triggerElement = Ext.get(t);
            me.triggerEvent = e;
            me.clearTimer('hide');
            if (!this.hidden && delegate) {
                this.hidden = true;
            }
            if (this.hidden) {
                me.delayShow();
            }
        }
    },
    onTargetBlur: function(e) {
        var me = this,
            delegate = me.delegate,
            t;
        if (me.disabled) {
            return;
        }
        t = delegate ? e.getTarget(delegate) : true;
        if (t) {
            me.triggerElement = Ext.get(t);
            me.triggerEvent = e;
            me.clearTimer('hide');
            if (!this.hidden && this.autoHide) {
                if (me.showTimer) {
                    me.clearTimer('show');
                    me.triggerElement = null;
                }
                me.delayHide();
            }
        }
    },
    onTargetOver: function(e) {
        var me = this,
            delegate = me.delegate,
            t;
        if (me.disabled || e.within(me.eventTarget, true)) {
            return;
        }
        t = delegate ? e.getTarget(delegate) : true;
        if (t) {
            me.triggerElement = Ext.get(t);
            me.triggerEvent = e;
            me.clearTimer('hide');
            me.delayShow();
        }
    },
    delayShow: function() {
        var me = this;
        if (me.hidden && !me.showTimer) {
            if ((Ext.Date.getElapsed(me.lastActive) < me.quickShowInterval) || (me.showDelay <= 0)) {
                me.show();
            } else {
                me.showTimer = Ext.defer(me.showFromDelay, me.showDelay, me);
            }
        } else if (!me.hidden && me.autoHide !== false) {
            me.show();
        }
    },
    showFromDelay: function() {
        this.fromDelayShow = true;
        this.show();
        delete this.fromDelayShow;
    },
    onTargetOut: function(e) {
        var me = this,
            triggerEl = me.triggerElement,
            target = triggerEl === true ? me.eventTarget : triggerEl;
        if (me.disabled || !triggerEl || e.within(target, true)) {
            return;
        }
        if (me.showTimer) {
            me.clearTimer('show');
            me.triggerElement = null;
        }
        if (me.autoHide !== false) {
            me.delayHide();
        }
    },
    delayHide: function() {
        var me = this;
        if (!me.hidden && !me.hideTimer) {
            if (me.hideDelay > 0) {
                me.hideTimer = Ext.defer(me.hide, me.hideDelay, me);
            } else {
                me.hide();
            }
        }
    },
    show: function() {
        var me = this;
        this.callParent(arguments);
        if (this.hidden === false) {
            if (me.alignment) {
                me.alignment = me.origalignment;
            }
            me.doAlign();
            if (this.animation) {
                this.el.setOpacity(0, false);
                this.el.fadeIn(this.animation);
            }
        }
        if (me.dismissDelay && me.autoHide !== false) {
            me.dismissTimer = Ext.defer(me.hide, me.dismissDelay, me);
        }
        if (!this.wasFirstShow) {
            this.wasFirstShow = true;
            this.firstShow();
        }
    },
    toggle: function() {
        this.hidden ? this.show() : this.hide();
    },
    firstShow: function() {
        if (this.headerToolbar) {
            this.headerToolbar.updateLayout();
            this.doHeaderToolbarAlign();
        }
        if (this.bodyWidget) {
            this.bodyWidget.updateLayout();
        }
    },
    _timerNames: {},
    clearTimer: function(name) {
        var me = this,
            names = me._timerNames,
            propName = names[name] || (names[name] = name + 'Timer'),
            timer = me[propName];
        if (timer) {
            clearTimeout(timer);
            me[propName] = null;
        }
    },
    clearTimers: function() {
        var me = this;
        me.clearTimer('show');
        me.clearTimer('dismiss');
        me.clearTimer('hide');
    },
    onShow: function() {
        var me = this;
        me.callParent(arguments);
        if (this.trigger == "hover" || this.closeOnOutsideClick) {
            me.mon(Ext.getDoc(), 'mousedown', me.onDocMouseDown, me);
        }
    },
    onHide: function() {
        var me = this;
        me.callParent(arguments);
        if (me.animation) {
            me.el.show();
            me.el.fadeOut(me.animation);
        }
        if (me.trigger == "hover" || this.closeOnOutsideClick) {
            me.mun(Ext.getDoc(), 'mousedown', me.onDocMouseDown, me);
        }
    },
    onDocMouseDown: function(e) {
        var me = this,
            t;
        if (!e.within(me.el.dom)) {
            if (me.trigger !== "manual" && e.within(me.target)) {
                t = this.delegate ? e.getTarget(this.delegate) : true;
                if (t) {
                    return;
                }
            }
            me.disable();
            Ext.defer(me.doEnable, 100, me);
        }
    },
    doEnable: function() {
        if (!this.isDestroyed) {
            this.enable();
        }
    },
    onDisable: function() {
        this.callParent();
        this.clearTimers();
        this.hide();
    },
    checkDom: function() {
        var d = this.target.dom;
        if (!d || (!d.parentNode || (!d.offsetParent && !Ext.getElementById(this.target.id)))) {
            this.destroy();
        }
    },
    beforeDestroy: function() {
        var me = this;
        me.clearTimers();
        delete me.target;
        delete me.triggerElement;
        if (me.checkDomInterval) {
            clearInterval(me.checkDomInterval);
        }
        if (me.focusInInterval) {
            clearInterval(me.focusInInterval);
        }
        if (this.headerToolbar && this.headerToolbar.destroy) {
            this.headerToolbar.destroy();
        }
        if (this.bodyWidget && this.bodyWidget.destroy) {
            this.bodyWidget.destroy();
        }
        me.callParent();
    },
    onDestroy: function() {
        if (this.trigger == "hover" || this.closeOnOutsideClick) {
            Ext.getDoc().un('mousedown', this.onDocMouseDown, this);
        }
        if (!this.destroyFromCmp && this.calloutOwner && this.calloutOwner.callouts) {
            Ext.Array.remove(this.calloutOwner.callouts, this);
        }
        this.callParent();
    },
    setZIndex: function(index) {
        var me = this;
        me.el.setStyle("zIndex", index);
        index += 10;
        return index;
    }
});
Ext.MessageBox.callout = function(target, config) {
    return Ext.net.Callout.show(target, config);
};

Ext.net.TaskResponse = {
    stopTask: -1,
    stopAjax: -2
};
Ext.define("Ext.net.TaskManager", {
    extend: "Ext.util.Observable",
    constructor: function(config) {
        this.callParent(arguments);
        this.initManager();
    },
    getTasks: function() {
        return this.tasks;
    },
    initManager: function() {
        this.runner = new Ext.util.TaskRunner(this.interval || 10);
        var task;
        this.tasks = [];
        this.tasksConfig = this.tasksConfig || [];
        for (var i = 0; i < this.tasksConfig.length; i++) {
            task = this.createTask(this.tasksConfig[i]);
            this.tasks.push(task);
            if (task.autoRun) {
                Ext.Function.defer(this.startTask, this.autoRunDelay || 50, this, [task]);
            }
        }
    },
    addTask: function(taskConfig) {
        var task = this.createTask(taskConfig);
        this.tasks.push(task);
        if (task.autoRun) {
            this.startTask(task);
        }
    },
    removeTask: function(task) {
        task = this.getTask(task);
        if (!Ext.isEmpty(task)) {
            this.stopTask(task);
            Ext.Array.remove(this.tasks, task);
        }
    },
    getTask: function(id) {
        if (typeof id == "object") {
            return id;
        } else if (typeof id == "string") {
            for (var i = 0; this.tasks.length; i++) {
                if (this.tasks[i].id == id) {
                    return this.tasks[i];
                }
            }
        } else if (typeof id == "number") {
            return this.tasks[id];
        }
        return null;
    },
    startTask: function(task) {
        task = this.getTask(task);
        task.executing = true;
        if (task.onstart) {
            task.onstart.apply(task.scope || task);
        }
        this.runner.start(task);
    },
    stopTask: function(task) {
        this.runner.stop(this.getTask(task));
    },
    startAll: function() {
        for (var i = 0; i < this.tasks.length; i++) {
            this.startTask(this.tasks[i]);
        }
    },
    stopAll: function() {
        this.runner.stopAll();
    },
    createTask: function(config) {
        return Ext.apply({}, config, {
            owner: this,
            executing: false,
            interval: 1000,
            autoRun: true,
            waitPreviousRequest: false,
            onStop: function(t) {
                this.executing = false;
                if (this.onstop) {
                    this.onstop();
                }
                if (this._ts && this.owner.destroying) {
                    Ext.net.DirectEvent.abort(this._ts);
                }
            },
            onRemoteComplete: function() {
                delete this._ts;
                if (this.runOnComplete && this.executing) {
                    this.runOnComplete = false;
                    this.run();
                }
                if (!this.executing) {
                    this.runOnComplete = false;
                }
            },
            run: function() {
                if (!this.executing) {
                    return;
                }
                if (this.clientRun) {
                    var rt = this.clientRun.apply(arguments);
                    if (rt === Ext.net.TaskResponse.stopAjax) {
                        return;
                    } else if (rt === Ext.net.TaskResponse.stopTask) {
                        return false;
                    }
                }
                if (this.waitPreviousRequest && this._ts) {
                    this.runOnComplete = true;
                    return;
                }
                if (this.serverRun) {
                    var o = this.serverRun();
                    if (!o.alreadySetComplete) {
                        if (o.userComplete && Ext.isFunction(o.userComplete)) {
                            o.userComplete = Ext.Function.createSequence(o.userComplete, Ext.Function.bind(this.onRemoteComplete, this), this);
                        } else {
                            o.userComplete = Ext.Function.bind(this.onRemoteComplete, this);
                        }
                        o.alreadySetComplete = true;
                    }
                    o.control = this.owner;
                    this._ts = Ext.net.DirectEvent.request(o);
                }
            }
        });
    },
    setTaskInterval: function(taskId, newInterval) {
        var task = this.getTask(taskId),
            restart = false;
        if (task.executing) {
            this.stopTask(task);
            restart = true;
        }
        task.interval = newInterval;
        if (restart) {
            this.startTask(task);
        }
    },
    destroy: function() {
        this.destroying = true;
        this.stopAll();
        Ext.net.ComponentManager.unregisterId(this);
        delete this.tasks;
        delete this.runner;
    }
});

Ext.define("Ext.net.ClickRepeater", {
    extend: "Ext.util.ClickRepeater",
    ignoredButtons: [],
    btnEvents: {
        0: "leftclick",
        1: "middleclick",
        2: "rightclick"
    },
    constructor: function(config) {
        this.addEvents("leftclick", "rightclick", "middleclick");
        this.callParent([config.el, config]);
    },
    enable: function() {
        if (this.disabled) {
            this.el.on("mousedown", this.handleMouseDown, this);
            if (Ext.isIE) {
                this.el.on('dblclick', this.handleDblClick, this);
            }
            if ((this.preventDefault || this.stopDefault) && !this.isButtonIgnored(0)) {
                this.el.on("click", this.eventOptions, this);
            }
            if ((this.preventDefault || this.stopDefault) && !this.isButtonIgnored(2)) {
                this.el.on("contextmenu", this.eventOptions, this);
            }
        }
        this.disabled = false;
    },
    isButtonIgnored: function(e) {
        var ignored = false;
        Ext.each(this.ignoredButtons, function(b) {
            if (b == (e.button || e)) {
                ignored = true;
                return false;
            }
        }, this);
        return ignored;
    },
    handleMouseDown: function(e) {
        clearTimeout(this.timer);
        this.el.blur();
        if (this.pressedCls) {
            this.el.addCls(this.pressedCls);
        }
        this.mousedownTime = new Date();
        Ext.getDoc().on("mouseup", this.handleMouseUp, this);
        this.el.on("mouseout", this.handleMouseOut, this);
        if (!this.isButtonIgnored(e)) {
            this.fireEvent("mousedown", this, e);
            this.fireClick(e);
        }
        if (this.accelerate) {
            this.delay = 400;
        }
        e = new Ext.EventObjectImpl(e);
        this.timer = Ext.defer(this.click, this.delay || this.interval, this, [e]);
    },
    click: function(e) {
        if (!this.isButtonIgnored(e)) {
            this.fireClick(e);
        }
        this.timer = Ext.defer(this.click, this.accelerate ? this.easeOutExpo(Ext.Date.getElapsed(this.mousedownTime), 400, -390, 12000) : this.interval, this, [e]);
    },
    fireClick: function(e) {
        if (this.fireEvent("click", this, e) !== false) {
            this.fireEvent(this.btnEvents[e.button] || "click", this, e);
        }
    },
    handleMouseReturn: function(e) {
        this.el.un("mouseover", this.handleMouseReturn, this);
        if (this.pressedCls) {
            this.el.addCls(this.pressedCls);
        }
        this.click(e);
    },
    handleMouseUp: function(e) {
        clearTimeout(this.timer);
        this.el.un("mouseover", this.handleMouseReturn, this);
        this.el.un("mouseout", this.handleMouseOut, this);
        Ext.getDoc().un("mouseup", this.handleMouseUp, this);
        if (this.pressedCls) {
            this.el.removeCls(this.pressedCls);
        }
        if (!this.isButtonIgnored(e)) {
            this.fireEvent("mouseup", this, e);
        }
    }
});

Ext.core.Element.addMethods({
    addKeyListenerEx: function(key, fn, scope) {
        this.addKeyListener(key, fn || key.fn, scope || key.scope);
        return this;
    },
    initDDEx: function(group, config, overrides) {
        this.initDD(group, config, overrides);
        return this;
    },
    initDDProxyEx: function(group, config, overrides) {
        this.initDDProxy(group, config, overrides);
        return this;
    },
    initDDTargetEx: function(group, config, overrides) {
        this.initDDTarget(group, config, overrides);
        return this;
    },
    positionEx: function(pos, zIndex, x, y) {
        this.position(pos, zIndex, x, y);
        return this;
    },
    relayEventEx: function(eventName, observable) {
        this.relayEvent(eventName, observable);
        return this;
    },
    scrollEx: function(direction, distance, animate) {
        this.scroll(direction, distance, animate);
        return this;
    },
    unmaskEx: function() {
        this.unmask();
        return this;
    },
    singleSelect: function(selector, unique) {
        return Ext.get(Ext.select(selector, unique).elements[0]);
    },
    setValue: function(val) {
        if (Ext.isDefined(this.dom.value)) {
            this.dom.value = val;
        }
        return this;
    },
    getValue: function() {
        return Ext.isDefined(this.dom.value) ? this.dom.value : null;
    },
    removeAttribute: function(attr) {
        this.dom.removeAttribute(attr);
    },
    removeStyleProperty: function(prop) {
        this.dom.style[Ext.isIE8m ? "removeAttribute" : "removeProperty"](prop);
    }
});
if (!Ext.isIE && document.querySelector) {
    Ext.core.Element.prototype.getById = function(id, asDom) {
        if (Ext.isEmpty(id)) {
            return null;
        }
        var dom = document.getElementById(id) || this.dom.querySelector('#' + Ext.escapeId(id));
        return asDom ? dom : (dom ? Ext.get(dom) : null);
    };
}
Ext.dom.Element.override({
    isFocusable: function(asFocusEl) {
        var dom = this.dom,
            tabIndexAttr = dom && dom.getAttributeNode && dom.getAttributeNode('tabIndex'),
            focusRe = /^a|button|embed|iframe|input|object|select|textarea$/i,
            tabIndex, nodeName = dom.nodeName,
            canFocus = false;
        if (tabIndexAttr && tabIndexAttr.specified) {
            tabIndex = tabIndexAttr.value;
        }
        if (dom && !dom.disabled) {
            if (tabIndex == -1) {
                canFocus = Ext.FocusManager && Ext.FocusManager.enabled && asFocusEl;
            } else {
                if (focusRe.test(nodeName)) {
                    if ((nodeName !== 'a') || dom.href) {
                        canFocus = true;
                    }
                } else {
                    canFocus = tabIndex != null && tabIndex >= 0;
                }
            }
            canFocus = canFocus && this.isVisible(true);
        }
        return canFocus;
    }
});

Ext.History.initEx = function(config) {
    Ext.getBody().insertHtml('beforeend', '<form id="history-form" class="x-hide-display"><input type="hidden" id="x-history-field" /><iframe id="x-history-frame" src="' + Ext.SSL_SECURE_URL + '"></iframe></form>');
    var interval = setInterval(function() {
        if (!document.getElementById(Ext.History.fieldId)) {
            return false;
        }
        clearInterval(interval);
        Ext.History.init();
        if (config.listeners) {
            Ext.History.addListener(config.listeners);
        }
        if (config.directEvents) {
            Ext.History.addListener(config.directEvents);
        }
        if (config.proxyId || config.id) {
            Ext.History.proxyId = config.proxyId || config.id;
        }
    }, 20);
};

Ext.data.proxy.Server.override({
    appendAction: true,
    constructor: Ext.Function.createSequence(Ext.data.proxy.Server.prototype.constructor, function() {
        this.addEvents("beforerequest", "afterrequest");
    }),
    afterRequest: function(request, success) {
        this.fireEvent("afterrequest", this, request, success);
    },
    getUrl: function(request) {
        return request.url || this.api[request.action] || (request.action != "read" ? this.api["sync"] : "") || this.url;
    },
    buildRequest: function(operation) {
        this.fireEvent("beforerequest", this, operation);
        var me = this,
            params = operation.params = Ext.apply({}, operation.params, me.extraParams),
            request;
        Ext.applyIf(params, this.getParams(operation));
        if (operation.id !== undefined && params[me.idParam] === undefined) {
            params[me.idParam] = operation.id;
        }
        request = Ext.create('Ext.data.Request', {
            params: params,
            action: operation.action,
            records: operation.records,
            operation: operation,
            url: operation.url,
            proxy: this
        });
        if (this.json) {
            request.jsonData = request.params;
            if ((request.method || this.method) !== "GET") {
                delete request.params;
            }
        } else if (this.xml) {
            request.xmlData = request.params;
            if ((request.method || this.method) !== "GET") {
                delete request.params;
            }
        }
        request.url = this.buildUrl(request);
        if (this.appendAction && operation.allowWrite) {
            request.url = Ext.urlAppend(request.url, "action=" + operation.action);
        }
        operation.request = request;
        return request;
    },
    processResponse: function(success, operation, request, response, callback, scope) {
        var me = this,
            reader, result;
        if (success === true) {
            reader = me.getReader();
            reader.applyDefaults = operation.action === 'read';
            result = reader.read(me.extractResponseData(response));
            if (result.success !== false) {
                Ext.apply(operation, {
                    response: response,
                    resultSet: result
                });
                operation.commitRecords(result.records);
                operation.setCompleted();
                operation.setSuccessful();
            } else {
                operation.setException(result.message);
                me.fireEvent('exception', this, response, operation);
            }
        } else {
            me.setException(operation, response);
            me.fireEvent('exception', this, response, operation);
        }
        me.afterRequest(request, success);
        if (typeof callback == 'function') {
            callback.call(scope || me, operation);
        }
    }
});

Ext.define("Ext.data.proxy.Page", {
    extend: "Ext.data.proxy.Server",
    alias: 'proxy.page',
    isPageProxy: true,
    appendAction: false,
    extractResponseData: function(response) {
        return response.data;
    },
    buildUrl: function() {
        return '';
    },
    doRequest: function(operation, callback, scope) {
        var request = this.buildRequest(operation, callback, scope),
            writer = this.getWriter(),
            requestConfig = Ext.apply({}, this.requestConfig || {});
        if (operation.allowWrite()) {
            writer.encode = true;
            writer.root = "serviceParams";
            writer.allowSingle = false;
            request = writer.write(request);
        }
        requestConfig.userSuccess = this.createSuccessCallback(request, operation, callback, scope);
        requestConfig.userFailure = this.createErrorCallback(request, operation, callback, scope);
        if (request.params.serviceParams) {
            requestConfig.serviceParams = request.params.serviceParams;
            delete request.params.serviceParams;
        }
        requestConfig.extraParams = request.params;
        var directFn = this.directFn || this.api[operation.action] || (operation.action != "read" ? this.api["sync"] : null);
        if (directFn) {
            if (Ext.isString(directFn)) {
                directFn = Ext.decode(directFn);
            }
            var extraParams = requestConfig.extraParams,
                serviceParams = requestConfig.serviceParams;
            delete requestConfig.extraParams;
            delete requestConfig.serviceParams;
            requestConfig.successSeq = requestConfig.userSuccess;
            requestConfig.failureSeq = requestConfig.userFailure;
            delete requestConfig.userSuccess;
            delete requestConfig.userFailure;
            requestConfig.showFailureWarning = false;
            if (directFn.length === 1) {
                directFn(requestConfig);
            } else if (directFn.length === 2) {
                directFn(operation.action || null, requestConfig);
            } else if (directFn.length === 3) {
                directFn(operation.action || null, extraParams || null, requestConfig);
            } else {
                directFn(operation.action || null, extraParams || null, serviceParams || null, requestConfig);
            }
        } else {
            Ext.apply(requestConfig, {
                control: operation.store,
                eventType: "postback",
                action: operation.action
            });
            Ext.net.DirectEvent.request(requestConfig);
        }
        return request;
    },
    createSuccessCallback: function(request, operation, callback, scope) {
        var me = this;
        return function(response, result, context, type, action, extraParams) {
            var res;
            try {
                if (me.directFn || me.api[operation.action] || (operation.action != "read" ? me.api["sync"] : null)) {
                    res = Ext.isEmpty(result.result, true) ? (result.d || result) : result.result;
                    response.data = res;
                    res = {
                        success: true
                    };
                } else {
                    res = result.serviceResponse;
                    response.data = res.data ? res.data : {};
                    if (res.metaData) {
                        response.metaData = res.metaData;
                    }
                    request._data = response.data;
                    if ((res || result).success === false) {
                        throw new Error((res || result).message);
                    }
                }
            } catch (e) {
                operation.setException(e.message);
                me.setException = Ext.emptyFn;
                me.processResponse(false, operation, request, response, callback, scope);
                me.setException = Ext.data.proxy.Page.prototype.setException;
                return;
            }
            me.processResponse(res.success, operation, request, response, callback, scope);
        };
    },
    createErrorCallback: function(request, operation, callback, scope) {
        var me = this;
        return function(response, result, context, type, action, extraParams) {
            operation.setException({
                status: response.status,
                statusText: response.statusText,
                responseText: response.responseText
            });
            me.processResponse(false, operation, request, response, callback, scope);
        };
    },
    setReader: function(reader) {
        var reader = this.callParent([reader]);
        reader.totalProperty = "total";
        if (!reader.root) {
            reader.root = "data";
        }
        reader.buildExtractors(true);
        return reader;
    }
});

Ext.data.proxy.Memory.override({
    constructor: function() {
        this.callParent(arguments);
        this.data = this.data || [];
    },
    getRecords: function() {
        return this.getReader().read(this.data || []).records;
    }
});
Ext.define("Ext.data.proxy.PagingMemory", {
    extend: "Ext.data.proxy.Memory",
    alias: "proxy.pagingmemory",
    isMemoryProxy: true,
    read: function(operation, callback, scope) {
        var reader = this.getReader(),
            result = reader.read(this.data || []),
            groupers = operation.groupers,
            sorters = operation.sorters,
            filters, sorterFn, records;
        if (groupers && groupers.length) {
            sorters = sorters ? sorters.concat(groupers) : sorters;
        }
        if (operation.gridfilters !== undefined) {
            var r = [];
            for (var i = 0, len = result.records.length; i < len; i++) {
                if (operation.gridfilters.call(this, result.records[i])) {
                    r.push(result.records[i]);
                }
            }
            result.records = r;
            result.totalRecords = result.records.length;
        }
        scope = scope || this;
        filters = operation.filters;
        if (filters.length > 0) {
            records = [];
            Ext.each(result.records, function(record) {
                var isMatch = true,
                    length = filters.length,
                    i;
                for (i = 0; i < length; i++) {
                    var filter = filters[i],
                        fn = Ext.isFunction(filter) ? filter : filter.filterFn,
                        scope = filter.scope;
                    isMatch = isMatch && (!fn || fn.call(scope, record));
                }
                if (isMatch) {
                    records.push(record);
                }
            }, this);
            result.records = records;
            result.totalRecords = result.total = records.length;
        }
        if (sorters.length > 0) {
            sorterFn = function(r1, r2) {
                var result = sorters[0].sort(r1, r2),
                    length = sorters.length,
                    i;
                for (i = 1; i < length; i++) {
                    result = result || sorters[i].sort.call(this, r1, r2);
                }
                return result;
            };
            result.records.sort(sorterFn);
        }
        if (this.enablePaging !== false && operation.start !== undefined && operation.limit !== undefined && operation.isPagingStore !== true) {
            result.records = Ext.Array.slice(result.records, operation.start, operation.start + operation.limit);
            result.count = result.records.length;
        }
        Ext.apply(operation, {
            resultSet: result
        });
        operation.setCompleted();
        operation.setSuccessful();
        Ext.callback(callback, scope, [operation]);
    }
});


Ext.data.StoreManager.getArrayStore = function(fieldsCount) {
    var fields = ['field1'],
        i;
    fieldsCount = fieldsCount || 1;
    for (i = 2; i <= fieldsCount; ++i) {
        fields.push('field' + i);
    }
    return new Ext.data.ArrayStore({
        data: [],
        fields: fields,
        autoDestroy: true,
        autoCreated: true,
        expanded: false
    });
};
Ext.data.AbstractStore.override({
    autoDestroy: true,
    constructor: function(config) {
        var me = this;
        if (config && config.storeId) {
            var store = Ext.data.StoreManager.lookup(config.storeId);
            if (store) {
                store.destroyStore();
            }
        }
        me.callParent(arguments);
        this.addEvents("exception");
        if (this.proxy && this.proxy.buildRequest) {
            me.proxy.on("exception", me.onProxyException, me);
            me.proxy.on("beforerequest", me.buildRequestParams, me);
        }
    },
    onProxyException: function(proxy, response, operation) {
        var error = operation.getError() || "Unknown error",
            message = Ext.isString(error) ? error : ("(" + error.status + ")" + error.statusText);
        this.fireEvent("exception", proxy, response, operation);
        if (Ext.net.DirectEvent.fireEvent("ajaxrequestexception", response, {
                "errorMessage": message
            }, null, null, null, null, operation) !== false) {
            if (this.showWarningOnFailure !== false) {
                Ext.net.DirectEvent.showFailure(response, response.responseText);
            }
        }
    },
    buildRequestParams: function(proxy, operation) {
        operation.store = this;
        if (operation.allowWrite() && this.writeParameters) {
            this.buildWriteParams(operation);
        } else if (this.readParameters) {
            this.buildReadParams(operation);
        }
    },
    buildWriteParams: function(operation) {
        var prms = this.writeParameters(operation),
            action = operation.action;
        operation.params = operation.params || {};
        if (prms.apply) {
            if (prms.apply["all"]) {
                Ext.apply(operation.params, prms.apply["all"]);
            }
            if (prms.apply[action]) {
                Ext.apply(operation.params, prms.apply[action]);
            }
        }
        if (prms.applyIf) {
            if (prms.applyIf["all"]) {
                Ext.applyIf(operation.params, prms.applyIf["all"]);
            }
            if (prms.applyIf[action]) {
                Ext.applyIf(operation.params, prms.applyIf[action]);
            }
        }
    },
    buildReadParams: function(operation) {
        var prms = this.readParameters(operation);
        operation.params = operation.params || {};
        if (prms.apply) {
            Ext.apply(operation.params, prms.apply);
        }
        if (prms.applyIf) {
            Ext.applyIf(operation.params, prms.applyIf);
        }
    },
    createTempProxy: function(callback, proxyConfig, sync) {
        var oldProxy = this.proxy,
            proxyId = Ext.id(),
            proxy = this.serverProxy ? Ext.createByAlias('proxy.' + this.serverProxy.type, Ext.apply({
                model: this.model,
                reader: {
                    type: oldProxy && oldProxy.reader && oldProxy.reader.type ? oldProxy.reader.type : "json",
                    root: oldProxy && oldProxy.reader && oldProxy.reader.root ? "data." + oldProxy.reader.root : "data"
                },
                writer: oldProxy.writer
            }, proxyConfig || {}, this.serverProxy)) : Ext.createByAlias('proxy.page', Ext.applyIf({
                type: 'page',
                model: this.model,
                reader: {
                    type: oldProxy && oldProxy.reader && oldProxy.reader.type ? oldProxy.reader.type : "json",
                    root: oldProxy && oldProxy.reader && oldProxy.reader.root ? "data." + oldProxy.reader.root : "data"
                },
                writer: oldProxy.writer
            }, proxyConfig || {}));
        this.proxy = proxy;
        this[proxyId] = proxy;
        this._oldProxy = oldProxy;
        this.proxy.on("exception", this.onProxyException, this);
        this.proxy.on("beforerequest", this.buildRequestParams, this);
        this.proxy.on("beforerequest", function() {
            this.proxy = oldProxy;
        }, this, {
            single: true
        });
        if (sync) {
            this.proxy.onBatchComplete = Ext.Function.createInterceptor(this.proxy.onBatchComplete, function(batchOptions, batch) {
                if (callback) {
                    callback.call(this, null, !batch.hasException);
                }
                this.proxy.onDestroy();
                this.proxy.clearListeners();
                delete this.store[proxyId];
                delete this._oldProxy;
            }, {
                proxy: this.proxy,
                oldProxy: oldProxy,
                store: this
            });
        } else {
            this.proxy.on("afterrequest", function(proxy, request, success) {
                if (callback) {
                    callback.call(this, request, success);
                }
                this.proxy.onDestroy();
                this.proxy.clearListeners();
                delete this.store[proxyId];
            }, {
                proxy: this.proxy,
                oldProxy: oldProxy,
                store: this
            });
        }
    },
    reload: function(options) {
        return this.load(Ext.apply(this.lastOptions || {}, options));
    },
    getChangedData: function(options) {
        options = options || {};
        var json = {},
            me = this,
            obj, newRecords = this.getNewRecords(),
            updatedRecords = this.getUpdatedRecords(),
            removedRecords = this.getRemovedRecords(),
            idProp = me.proxy && me.proxy.reader ? me.proxy.reader.getIdProperty() : "id",
            handleRecords = function(array) {
                var i, len, obj, list, buffer = [];
                for (i = 0, len = array.length; i < len; i++) {
                    obj = {};
                    record = array[i];
                    list = Ext.apply(obj, record.data);
                    if (list.hasOwnProperty(idProp)) {
                        if (record.phantom) {
                            if (record.clientIdProperty) {
                                list[record.clientIdProperty] = record.internalId;
                            }
                        } else {
                            list[idProp] = record.getId();
                        }
                    }
                    list = this.prepareRecord(list, record, options, record.phantom);
                    if (record.phantom && (options.skipIdForPhantomRecords !== false) && (list && list.hasOwnProperty(idProp))) {
                        delete list[idProp];
                        delete list[record.clientIdProperty];
                    }
                    if (!Ext.isEmptyObj(list)) {
                        buffer.push(list);
                    }
                }
                return buffer;
            };
        if (removedRecords.length > 0) {
            obj = handleRecords.call(this, removedRecords);
            if (obj.length > 0) {
                json.Deleted = obj;
            }
        }
        if (updatedRecords.length > 0) {
            obj = handleRecords.call(this, updatedRecords);
            if (obj.length > 0) {
                json.Updated = obj;
            }
        }
        if (newRecords.length > 0) {
            obj = handleRecords.call(this, newRecords);
            if (obj.length > 0) {
                json.Created = obj;
            }
        }
        return options.encode ? Ext.util.Format.htmlEncode(json) : json;
    },
    prepareRecord: function(data, record, options, isNew) {
        var newData = {},
            field, idProp = this.proxy && this.proxy.reader ? this.proxy.reader.getIdProperty() : "id";
        if (options.filterRecord && options.filterRecord(record) === false) {
            return;
        }
        if (options.visibleOnly && options.grid) {
            var columns = options.grid.headerCt.getVisibleGridColumns(),
                i, len;
            for (i = 0, len = columns.length; i < len; i++) {
                newData[columns[i].dataIndex] = data[columns[i].dataIndex];
            }
            data = newData;
        }
        if (options.dirtyRowsOnly && !isNew) {
            if (!record.dirty) {
                return;
            }
        }
        if (options.dirtyCellsOnly === true && !isNew) {
            newData = {};
            for (var j in data) {
                if (record.isModified(j)) {
                    newData[j] = data[j];
                }
            }
            data = newData;
        }
        for (var k in data) {
            if (options.filterField && options.filterField(record, k, data[k]) === false) {
                delete data[k];
            }
        }
        if (options.mappings !== false && this.saveMappings !== false) {
            var m, map = record.fields.map,
                mappings = {};
            Ext.iterate(data, function(prop, value) {
                m = map[prop];
                if (m) {
                    mappings[m.mapping ? m.mapping : m.name] = value;
                }
            });
            if (options.excludeId !== true) {
                if (record.phantom) {
                    if (record.clientIdProperty) {
                        mappings[record.clientIdProperty] = record.internalId;
                    }
                } else {
                    mappings[idProp] = record.getId();
                }
            }
            data = mappings;
        }
        for (var k in data) {
            field = this.getFieldByName(k);
            if (Ext.isEmpty(data[k], false) && this.isSimpleField(k, field)) {
                switch (field.submitEmptyValue) {
                    case "null":
                        data[k] = null;
                        break;
                    case "emptystring":
                        data[k] = "";
                        break;
                    default:
                        delete data[k];
                        break;
                }
            }
        }
        if (options.prepare) {
            options.prepare(data, record);
        }
        return data;
    },
    getFieldByName: function(name) {
        for (var i = 0; i < this.model.prototype.fields.getCount(); i++) {
            var field = this.model.prototype.fields.get(i);
            if (name === (field.mapping || field.name)) {
                return field;
            }
        }
    },
    isSimpleField: function(name, field) {
        var f = field || this.getFieldByName(name),
            type = f && f.type ? f.type.type : "";
        return type === "int" || type === "float" || type === "boolean" || type === "date";
    },
    sync: function(options, proxyConfig) {
        var me = this,
            operations = {},
            toCreate = me.getNewRecords(),
            toUpdate = me.getUpdatedRecords(),
            toDestroy = me.getRemovedRecords(),
            needsSync = false;
        if (toCreate.length > 0) {
            operations.create = toCreate;
            needsSync = true;
        }
        if (toUpdate.length > 0) {
            operations.update = toUpdate;
            needsSync = true;
        }
        if (toDestroy.length > 0) {
            operations.destroy = toDestroy;
            needsSync = true;
        }
        if (needsSync && me.fireEvent('beforesync', operations) !== false) {
            options = options || {};
            if (me.proxy instanceof Ext.data.proxy.Memory) {
                me.createTempProxy(Ext.emptyFn, proxyConfig, true);
            }
            me.proxy.batch(Ext.apply(options, {
                operations: operations,
                listeners: me.getBatchListeners()
            }));
        }
        return me;
    }
});
Ext.data.Store.override({
    dirtyWarningTitle: "Uncommitted Changes",
    dirtyWarningText: "You have uncommitted changes.  Are you sure you want to reload data?",
    constructor: function(config) {
        config = Ext.apply({}, config);
        var me = this,
            groupers = config.groupers || me.groupers,
            groupField = config.groupField || me.groupField,
            proxy, data;
        data = config.data || me.data;
        if (data) {
            me.inlineData = data;
            delete config.data;
        }
        if (!groupers && groupField) {
            groupers = [{
                property: groupField,
                direction: config.groupDir || me.groupDir
            }];
            if (config.getGroupString || (me.getGroupString !== Ext.data.Store.prototype.getGroupString)) {
                groupers[0].getGroupString = function(record) {
                    return me.getGroupString(record);
                }
            }
        }
        delete config.groupers;
        me.groupers = new Ext.util.MixedCollection(false, Ext.data.Store.grouperIdFn);
        me.groupers.addAll(me.decodeGroupers(groupers));
        me.groups = new Ext.util.MixedCollection(false, Ext.data.Store.groupIdFn);
        Ext.data.Store.superclass.constructor.apply(this, [config]);
        if (me.buffered) {
            me.data = new Ext.data.PageMap({
                store: me,
                keyFn: Ext.data.Store.recordIdFn,
                pageSize: me.pageSize,
                maxSize: me.purgePageCount,
                listeners: {
                    clear: me.onPageMapClear,
                    scope: me
                }
            });
            me.pageRequests = {};
            me.remoteSort = me.remoteGroup = me.remoteFilter = true;
            me.sortOnLoad = false;
            me.filterOnLoad = false;
        } else {
            me.data = new Ext.util.MixedCollection({
                getKey: Ext.data.Store.recordIdFn,
                maintainIndices: true
            });
            me.data.pageSize = me.pageSize;
        }
        if (me.remoteGroup) {
            me.remoteSort = true;
        }
        me.sorters.insert(0, me.groupers.getRange());
        proxy = me.proxy;
        data = me.inlineData;
        if (!me.buffered && !me.pageSize) {
            me.pageSize = me.defaultPageSize;
        }
        if (data) {
            if (proxy instanceof Ext.data.proxy.Memory) {
                proxy.data = data;
                me.read();
            } else {
                me.add.apply(me, [data]);
            }
            if (me.sorters.items.length && !me.remoteSort) {
                me.group(null, null, true);
            }
            delete me.inlineData;
        } else if (me.autoLoad) {
            this.autoLoadDeferId = Ext.defer(me.load, 1, me, [typeof me.autoLoad === 'object' ? me.autoLoad : undefined]);
        }
        this.on("bulkremove", this.updateRecordIndexes, this);
    },
    onProxyLoad: function(operation) {
        var me = this,
            resultSet = operation.getResultSet(),
            records = operation.getRecords(),
            successful = operation.wasSuccessful();
        if (me.isDestroyed) {
            return;
        }
        if (resultSet) {
            me.totalCount = resultSet.total;
        }
        Ext.suspendLayouts();
        me.loading = false;
        if (successful) {
            me.loadRecords(records, operation);
        }
        if (me.hasListeners.load) {
            me.fireEvent('load', me, records, successful);
        }
        if (me.hasListeners.read) {
            me.fireEvent('read', me, records, successful);
        }
        Ext.callback(operation.callback, operation.scope || me, [records, operation, successful]);
        Ext.resumeLayouts(true);
    },
    destroyStore: function() {
        var implicitModelName, me = this;
        if (!me.isDestroyed) {
            me.clearListeners();
            if (me.storeId) {
                Ext.data.StoreManager.unregister(me);
            }
            me.clearData();
            me.data = me.tree = me.sorters = me.filters = me.groupers = null;
            if (me.reader) {
                me.reader.destroyReader();
            }
            me.proxy = me.reader = me.writer = null;
            me.isDestroyed = true;
            if (me.implicitModel) {
                implicitModelName = Ext.getClassName(me.model);
                Ext.undefine(implicitModelName);
                Ext.ModelManager.unregisterType(implicitModelName);
            } else {
                me.model = null;
            }
            if (Ext.isDefined(me.autoLoadDeferId)) {
                clearTimeout(me.autoLoadDeferId);
            }
        }
    },
    addField: function(field, index, rebuildMeta) {
        if (typeof field == "string") {
            field = {
                name: field
            };
        }
        field = new Ext.data.Field(field);
        if (Ext.isEmpty(index) || index === -1) {
            this.model.prototype.fields.replace(field);
        } else {
            this.model.prototype.fields.insert(index, field);
        }
        if (typeof field.defaultValue != "undefined") {
            this.each(function(r) {
                if (typeof r.data[field.name] == "undefined") {
                    r.data[field.name] = field.defaultValue;
                }
            });
        }
        if (rebuildMeta && this.proxy && this.proxy.reader) {
            this.proxy.reader.buildExtractors(true);
        }
    },
    rebuildMeta: function() {
        if (this.proxy.reader) {
            this.proxy.reader.buildExtractors(true);
        }
    },
    removeFields: function() {
        this.model.prototype.fields.clear();
        this.removeAll();
    },
    removeField: function(name) {
        this.model.prototype.fields.removeAtKey(name);
        this.each(function(r) {
            delete r.data[name];
            if (r.modified) {
                delete r.modified[name];
            }
        });
    },
    getRecordsValues: function(options) {
        options = options || {};
        var records = (options.records ? options.records : (options.currentPageOnly ? this.getRange() : this.getAllRange())) || [],
            values = [],
            i;
        for (i = 0; i < records.length; i++) {
            var obj = {},
                dataR, idProp = this.proxy.reader.getIdProperty();
            dataR = Ext.apply(obj, records[i].data);
            if (idProp && dataR.hasOwnProperty(idProp)) {
                obj[idProp] = options.excludeId === true ? undefined : records[i].getId();
            }
            dataR = this.prepareRecord(dataR, records[i], options);
            if (!Ext.isEmptyObj(dataR)) {
                values.push(dataR);
            }
        }
        return values;
    },
    isDirty: function() {
        return this.getNewRecords().length > 0 || this.getUpdatedRecords().length > 0 || this.getRemovedRecords().length > 0;
    },
    _load: Ext.data.Store.prototype.load,
    load: function(options) {
        if (this.warningOnDirty && this.isDirty()) {
            Ext.Msg.confirm(this.dirtyWarningTitle, this.dirtyWarningText, function(btn, text) {
                if (btn == "yes") {
                    this._load(options);
                }
            }, this);
            return this;
        }
        return this._load(options);
    },
    getAllRange: function(start, end) {
        return this.getRange(start, end);
    },
    _reload: Ext.data.Store.prototype.reload,
    reload: function(options, proxyConfig) {
        var memProxy = this.proxy instanceof Ext.data.proxy.Memory;
        if (memProxy) {
            this.createTempProxy(function(request, success) {
                if (success) {
                    if (this.store.isPagingStore && !this.store.allData) {
                        this.store.applyPaging();
                    }
                    this.oldProxy.data = request._data && request._data.data ? request._data.data : {};
                    if (this.oldProxy.reader) {
                        this.oldProxy.reader.rawData = this.oldProxy.data;
                    }
                }
            }, proxyConfig);
        }
        var result = this._reload(options);
        if (memProxy && !this.loading) {
            this.proxy.onDestroy();
            this.proxy.clearListeners();
            this.proxy = this._oldProxy;
            delete this.store[proxyId];
            delete this._oldProxy;
        }
        return result;
    },
    commitChanges: function(actions) {
        var me = this,
            i, len, records, record;
        actions = Ext.apply({
            create: true,
            update: true,
            destroy: true
        }, actions || {});
        if (actions.create) {
            records = me.getNewRecords();
            len = records.length;
            if (len > 0) {
                for (i = 0; i < len; i++) {
                    record = records[i];
                    record.phantom = false;
                    record.commit();
                }
            }
        }
        if (actions.update) {
            records = me.getUpdatedRecords();
            len = records.length;
            if (len > 0) {
                for (i = 0; i < len; i++) {
                    record = records[i];
                    record.commit();
                }
            }
        }
        if (actions.destroy) {
            records = me.getRemovedRecords();
            len = records.length;
            if (len > 0) {
                this.removed = [];
            }
        }
    },
    rejectChanges: function(actions) {
        var me = this,
            i, len, records, record;
        actions = Ext.apply({
            create: true,
            update: true,
            destroy: true
        }, actions || {});
        if (actions.create) {
            records = me.getNewRecords();
            len = records.length;
            if (len > 0) {
                for (i = 0; i < len; i++) {
                    record = records[i];
                    me.remove(record, true);
                }
            }
        }
        if (actions.update) {
            records = me.getUpdatedRecords();
            len = records.length;
            if (len > 0) {
                for (i = 0; i < len; i++) {
                    record = records[i];
                    record.reject();
                }
            }
        }
        if (actions.destroy) {
            records = me.getRemovedRecords();
            len = records.length;
            if (records.length > 0) {
                var autoSync = me.autoSync;
                me.autoSync = false;
                me.add(records);
                me.autoSync = autoSync;
                me.removed = [];
            }
        }
    },
    submitData: function(options, requestConfig) {
        this._submit(null, options, requestConfig);
    },
    _submit: function(data, options, requestConfig) {
        if (!data) {
            data = this.getRecordsValues(options);
        }
        if (!data || data.length === 0) {
            return false;
        }
        data = Ext.encode(data);
        if (options && options.encode) {
            data = Ext.util.Format.htmlEncode(data);
        }
        options = {
            params: (options && options.params) ? options.params : {}
        };
        if (Ext.isString(requestConfig)) {
            requestConfig = {
                url: requestConfig
            };
        }
        var config = {},
            ac = requestConfig || {},
            isClean = !!ac.url;
        ac.userSuccess = ac.success;
        ac.userFailure = ac.failure;
        delete ac.success;
        delete ac.failure;
        ac.extraParams = options.params;
        ac.enforceFailureWarning = !ac.userFailure;
        if (isClean) {
            ac.cleanRequest = true;
            ac.extraParams = ac.extraParams || {};
            ac.extraParams.data = data;
        }
        Ext.apply(config, ac, {
            control: this,
            eventType: "postback",
            action: "submit",
            serviceParams: data
        });
        Ext.net.DirectEvent.request(config);
    },
    commitRemoving: function(id) {
        var recs = this.removed,
            len = recs.length,
            i;
        for (i = 0; i < len; i++) {
            if (recs[i].getId() === id) {
                Ext.Array.erase(this.removed, i, 1);
                return;
            }
        }
    },
    rejectRemoving: function(id) {
        var recs = this.removed,
            len = recs.length,
            i;
        for (i = 0; i < len; i++) {
            if (recs[i].getId() === id) {
                this.insert(0, recs[i]);
                recs[i].reject();
                Ext.Array.erase(this.removed, i, 1);
                return;
            }
        }
    },
    getByInternalId: function(internalId) {
        var result;
        if (this.buffered) {
            result = (this.snapshot || this.data).findBy(function(record) {
                return record.internalId == internalId;
            });
        } else {
            result = this.data.get(internalId);
        }
        return result;
    },
    group: function(groupers, direction) {
        var useDefault = Ext.isString(groupers) && !this.groupers.get(groupers);
        this.callParent([groupers, direction || (useDefault ? "ASC" : direction)]);
    },
    updateRecordIndexes: function() {
        var i, len = this.getCount(),
            records = this.getRange(),
            start = ((this.currentPage - 1) * this.pageSize) || 0;
        for (i = 0; i < len; i++) {
            records[i].index = start + i;
        }
    }
});
Ext.StoreManager.lookup("ext-empty-store").autoDestroy = false;

Ext.define("Ext.data.PagingStore", {
    extend: "Ext.data.Store",
    alias: "store.paging",
    isPagingStore: true,
    destroyStore: function() {
        this.callParent(arguments);
        this.data = this.allData = this.snapshot = null;
    },
    doSort: function(sorterFn) {
        var me = this,
            count, range, ln, i;
        if (me.remoteSort) {
            if (me.buffered) {
                me.data.clear();
                me.loadPage(1);
            } else {
                me.load();
            }
        } else {
            if (me.allData) {
                me.data = me.allData;
                delete me.allData;
            }
            if (me.snapshot) {
                me.snapshot.sortBy(sorterFn);
            }
            me.data.sortBy(sorterFn);
            me.applyPaging();
            if (!me.buffered) {
                range = me.getRange();
                ln = range.length;
                for (i = 0; i < ln; i++) {
                    range[i].index = i;
                }
            }
            me.fireEvent('datachanged', me);
            me.fireEvent('refresh', me);
        }
    },
    insert: function(index, records) {
        var me = this,
            sync = false,
            i, record, len, defaults = me.modelDefaults,
            out;
        if (!Ext.isIterable(records)) {
            out = records = [records];
        } else {
            out = [];
        }
        len = records.length;
        if (len) {
            for (i = 0; i < len; i++) {
                record = records[i];
                if (!record.isModel) {
                    record = me.createModel(record);
                }
                out[i] = record;
                if (defaults) {
                    record.set(defaults);
                }
                record.join(me);
                sync = sync || record.phantom === true;
            }
            me.data.insert(index, out);
            if (me.snapshot) {
                me.snapshot.addAll(out);
            }
            if (me.allData) {
                me.allData.addAll(out);
            }
            me.totalCount += out.length;
            if (me.requireSort) {
                me.suspendEvents();
                me.sort();
                me.resumeEvents();
            }
            if (me.isGrouped()) {
                me.updateGroupsOnAdd(out);
            }
            me.fireEvent('add', me, out, index);
            me.fireEvent('datachanged', me);
            if (me.autoSync && sync && !me.autoSyncSuspended) {
                me.sync();
            }
        }
        return out;
    },
    remove: function(records, isMove, silent) {
        isMove = isMove === true;
        var me = this,
            sync = false,
            snapshot = me.snapshot,
            data = me.data,
            i = 0,
            length, info = [],
            allRecords = [],
            indexes = [],
            item, isNotPhantom, index, record, removeRange, removeCount, fireRemoveEvent = !silent && me.hasListeners.remove;
        if (records.isModel) {
            records = [records];
            length = 1;
        } else if (Ext.isIterable(records)) {
            length = records.length;
        } else if (typeof records === 'object') {
            removeRange = true;
            i = records.start;
            length = records.end + 1;
            removeCount = length - i;
        }
        if (!removeRange) {
            for (i = 0; i < length; ++i) {
                record = records[i];
                if (typeof record == 'number') {
                    index = record;
                    record = data.getAt(index);
                } else {
                    index = me.indexOf(record);
                }
                if (record && index > -1) {
                    info.push({
                        record: record,
                        index: index
                    });
                }
                if (snapshot) {
                    snapshot.remove(record);
                }
                if (me.allData) {
                    me.allData.remove(record);
                }
                me.totalCount--;
            }
            info = Ext.Array.sort(info, function(o1, o2) {
                var index1 = o1.index,
                    index2 = o2.index;
                return index1 === o2.index2 ? 0 : (index1 < index2 ? -1 : 1);
            });
            i = 0;
            length = info.length;
        }
        for (; i < length; i++) {
            if (removeRange) {
                record = data.getAt(i);
                index = i;
            } else {
                item = info[i];
                record = item.record;
                index = item.index;
            }
            allRecords.push(record);
            indexes.push(index);
            isNotPhantom = record.phantom !== true;
            if (!isMove && isNotPhantom) {
                record.removedFrom = index;
                me.removed.push(record);
            }
            record.unjoin(me);
            index -= i;
            sync = sync || isNotPhantom;
            if (!removeRange) {
                data.removeAt(index);
                if (fireRemoveEvent) {
                    me.fireEvent('remove', me, record, index, !!isMove);
                }
            }
        }
        if (removeRange) {
            data.removeRange(records.start, removeCount);
        }
        if (!silent) {
            me.fireEvent('bulkremove', me, allRecords, indexes, !!isMove);
            me.fireEvent('datachanged', me);
        }
        if (!isMove && me.autoSync && sync && !me.autoSyncSuspended) {
            me.sync();
        }
    },
    removeAll: function(silent) {
        var me = this,
            snapshot = me.snapshot,
            data = me.data;
        if (snapshot) {
            snapshot.removeAll(data.getRange());
        }
        if (me.buffered) {
            if (data) {
                if (silent) {
                    me.suspendEvent('clear');
                }
                me.totalCount = 0;
                if (me.allData) {
                    me.allData.clear();
                    delete me.allData;
                } else if (me.snapshot) {
                    me.snapshot.clear();
                    delete me.snapshot;
                }
                data.clear();
                if (silent) {
                    me.resumeEvent('clear');
                }
            }
        } else {
            me.remove({
                start: 0,
                end: me.getCount() - 1
            }, false, silent);
            me.totalCount = 0;
            if (me.allData) {
                me.allData.clear();
                delete me.allData;
            } else if (me.snapshot) {
                me.snapshot.clear();
                delete me.snapshot;
            }
            if (silent !== true) {
                me.fireEvent('clear', me);
            }
        }
    },
    getById: function(id) {
        return (this.snapshot || this.allData || this.data).findBy(function(record) {
            return record.getId() === id;
        });
    },
    clearData: function(isLoad) {
        var me = this,
            records, i;
        if (me.allData) {
            me.data = me.allData;
            delete me.allData;
        } else if (me.snapshot) {
            me.data = me.snapshot;
            delete me.snapshot;
        }
        if (!me.buffered && me.data) {
            records = me.data.items;
            i = records.length;
            while (i--) {
                records[i].unjoin(me);
            }
        }
        if (me.data) {
            me.data.clear();
        }
        if (isLoad !== true || me.clearRemovedOnLoad) {
            me.removed.length = 0;
        }
    },
    load: function(options) {
        var forceLocal = false;
        if (options === true) {
            forceLocal = true;
        }
        options = options || {};
        if (forceLocal || ((!Ext.isDefined(options.action) || options.action === "read") && this.isPaging(options))) {
            Ext.Function.defer(function() {
                this.fireEvent('beforeload', this, new Ext.data.Operation(options));
                if (this.allData) {
                    this.data = this.allData;
                    delete this.allData;
                }
                this.applyPaging();
                var r = [].concat(this.data.items);
                this.fireEvent("datachanged", this, r);
                this.fireEvent("load", this, r, true);
                this.fireEvent('refresh', this);
                if (options.callback) {
                    options.callback.call(options.scope || this, r, options, true);
                }
            }, 1, this);
            return this;
        }
        options.isPagingStore = true;
        return this.callParent([options]);
    },
    loadRecords: function(records, options) {
        var me = this,
            i = 0,
            length = records.length,
            start, addRecords, snapshot = me.snapshot;
        if (options) {
            start = options.start;
            addRecords = options.addRecords;
        }
        if (!addRecords) {
            delete me.snapshot;
            me.clearData(true);
        } else if (snapshot) {
            snapshot.addAll(records);
        }
        me.data.addAll(records);
        if (start !== undefined) {
            for (; i < length; i++) {
                records[i].index = start + i;
                records[i].join(me);
            }
        } else {
            for (; i < length; i++) {
                records[i].join(me);
            }
        }
        if (!me.allData) {
            me.applyPaging();
        }
        me.suspendEvents();
        if (me.filterOnLoad && !me.remoteFilter) {
            me.filter();
        }
        if (me.sortOnLoad && !me.remoteSort) {
            me.sort(undefined, undefined, undefined, true);
        }
        me.resumeEvents();
        if (me.isGrouped()) {
            me.constructGroups();
        }
        me.fireEvent('datachanged', me, records);
        me.fireEvent('refresh', me);
    },
    loadPage: function(page, options) {
        var me = this;
        me.currentPage = page;
        options = Ext.apply({
            isPagingRequest: true,
            page: page,
            start: (page - 1) * me.pageSize,
            limit: me.pageSize,
            addRecords: !me.clearOnPageLoad
        }, options);
        if (me.buffered) {
            options.limit = me.viewSize || me.defaultViewSize;
            return me.loadToPrefetch(options);
        }
        me.read(options);
    },
    getTotalCount: function() {
        if (this.allData) {
            return this.allData.getCount();
        }
        return this.totalCount || 0;
    },
    filterBy: function(fn, scope) {
        this.snapshot = this.snapshot || this.allData || this.data.clone();
        this.data = this.queryBy(fn, scope || this);
        this.applyPaging();
        this.fireEvent("datachanged", this);
        this.fireEvent('refresh', this);
    },
    queryBy: function(fn, scope) {
        var data = this.snapshot || this.allData || this.data;
        return data.filterBy(fn, scope || this);
    },
    filter: function(filters, value) {
        if (Ext.isString(filters)) {
            filters = {
                property: filters,
                value: value
            };
        }
        var me = this,
            decoded = me.decodeFilters(filters),
            i, doLocalSort = me.sorters.length && me.sortOnFilter && !me.remoteSort,
            length = decoded.length;
        for (i = 0; i < length; i++) {
            me.filters.replace(decoded[i]);
        }
        filters = me.filters.items;
        if (filters.length) {
            if (me.remoteFilter) {
                delete me.totalCount;
                if (me.buffered) {
                    me.data.clear();
                    me.loadPage(1);
                } else {
                    me.currentPage = 1;
                    me.load();
                }
            } else {
                me.snapshot = me.snapshot || me.allData || me.data.clone();
                me.data = (me.snapshot || me.allData).filter(filters);
                me.constructGroups();
                if (doLocalSort) {
                    me.sort();
                    me.applyPaging();
                } else {
                    me.applyPaging();
                    me.fireEvent('datachanged', me);
                    me.fireEvent('refresh', me);
                }
            }
            me.fireEvent('filterchange', me, filters);
        }
    },
    clearFilter: function(suppressEvent) {
        var me = this;
        me.filters.clear();
        if (me.remoteFilter) {
            if (suppressEvent) {
                return;
            }
            delete me.totalCount;
            if (me.buffered) {
                me.data.clear();
                me.loadPage(1);
            } else {
                me.currentPage = 1;
                me.load();
            }
        } else if (me.isFiltered()) {
            me.data = me.snapshot;
            delete me.snapshot;
            delete this.allData;
            this.applyPaging();
            me.constructGroups();
            if (suppressEvent !== true) {
                me.fireEvent('datachanged', me);
                me.fireEvent('refresh', me);
            }
        }
        me.fireEvent('filterchange', me, me.filters.items);
    },
    isFiltered: function() {
        return !!(this.snapshot && this.snapshot != (this.allData || this.data));
    },
    collect: function(dataIndex, allowNull, bypassFilter) {
        var data = bypassFilter === true ? (this.snapshot || this.allData || this.data) : (this.allData || this.data);
        return data.collect(dataIndex, 'data', allowNull);
    },
    isPaging: function(options) {
        return options && options.isPagingRequest;
    },
    applyPaging: function() {
        var start = (this.currentPage - 1) * this.pageSize,
            limit = this.pageSize;
        var allData = this.data,
            data = new Ext.util.MixedCollection({
                getKey: Ext.data.Store.recordIdFn,
                maintainIndices: true
            });
        data.pageSize = this.pageSize;
        if (start >= allData.getCount()) {
            start = this.start = 0;
        }
        data.addAll(allData.getRange(start, start + limit - 1));
        this.allData = allData;
        this.data = data;
    },
    getAllRange: function(start, end) {
        return (this.allData || this.data).getRange(start, end);
    },
    findPage: function(record) {
        if ((typeof this.pageSize == "number")) {
            return Math.ceil(((this.allData || this.data).indexOf(record) + 1) / this.pageSize);
        }
        return -1;
    },
    getNewRecords: function() {
        return (this.allData || this.data).filterBy(this.filterNew).items;
    },
    getUpdatedRecords: function() {
        return (this.allData || this.data).filterBy(this.filterUpdated).items;
    }
});

Ext.data.TreeStore.override({
    proxy: "page",
    onProxyLoad: function(operation) {
        var me = this,
            successful = operation.wasSuccessful(),
            records = operation.getRecords(),
            node = operation.node;
        me.loading = false;
        Ext.suspendLayouts();
        node.set('loading', false);
        if (successful) {
            if (!me.clearOnLoad) {
                records = me.cleanRecords(node, records);
            }
            records = me.fillNode(node, records);
        }
        me.fireEvent('read', me, operation.node, records, successful);
        me.fireEvent('load', me, operation.node, records, successful);
        Ext.callback(operation.callback, operation.scope || me, [records, operation, successful]);
        Ext.resumeLayouts(true);
    },
    load: function(options) {
        options = options || {};
        options.params = options.params || {};
        var me = this,
            node = options.node || me.tree.getRootNode();
        if (!node) {
            node = me.setRootNode({
                expanded: true
            }, true);
        }
        options.id = node.getId();
        if (me.clearOnLoad) {
            if (me.clearRemovedOnLoad) {
                me.clearRemoved(node);
            }
            me.tree.un('remove', me.onNodeRemove, me);
            node.removeAll(false);
            me.tree.on('remove', me.onNodeRemove, me);
        }
        Ext.applyIf(options, {
            node: node
        });
        if (node && node.data.dataPath) {
            options.params["dataPath"] = node.data.dataPath;
        }
        Ext.data.TreeStore.superclass.load.call(this, options)
        if (node) {
            node.set('loading', true);
        }
        return me;
    },
    onBeforeNodeExpand: function(node, callback, scope, args) {
        var me = this,
            reader, dataRoot, data, callbackArgs;
        if (node.isLoaded()) {
            callbackArgs = [node.childNodes];
            if (args) {
                callbackArgs.push.apply(callbackArgs, args);
            }
            Ext.callback(callback, scope || node, callbackArgs);
        } else if (dataRoot = (data = (node.raw || node[node.persistenceProperty])[(reader = me.getProxy().getReader()).root])) {
            me.fillNode(node, reader.extractData(dataRoot));
            delete(node.raw || node[node.persistenceProperty])[reader.root];
            callbackArgs = [node.childNodes];
            if (args) {
                callbackArgs.push.apply(callbackArgs, args);
            }
            Ext.callback(callback, scope || node, callbackArgs);
        } else if (node.isLoading()) {
            me.on('load', function() {
                callbackArgs = [node.childNodes];
                if (args) {
                    callbackArgs.push.apply(callbackArgs, args);
                }
                Ext.callback(callback, scope || node, callbackArgs);
            }, me, {
                single: true
            });
        } else {
            me.read({
                node: node,
                callback: function() {
                    delete me.lastOptions.callback;
                    callbackArgs = [node.childNodes];
                    if (args) {
                        callbackArgs.push.apply(callbackArgs, args);
                    }
                    Ext.callback(callback, scope || node, callbackArgs);
                }
            });
        }
    }
});
Ext.data.NodeInterface.applyFields = Ext.Function.createInterceptor(Ext.data.NodeInterface.applyFields, function(modelClass, addFields) {
    addFields.push({
        name: 'text',
        type: 'string',
        defaultValue: null,
        persist: false
    });
    addFields.push({
        name: 'dataPath',
        type: 'string',
        defaultValue: null,
        persist: false
    });
    addFields.push({
        name: 'selected',
        type: 'bool',
        defaultValue: false,
        persist: false
    });
    addFields.push({
        name: 'hidden',
        type: 'bool',
        defaultValue: false,
        persist: false
    });
    modelClass.override({
        reload: function(options) {
            var me = this;
            options = options || {};
            treeStore = me.store;
            if (treeStore) {
                options = Ext.apply({
                    node: this,
                    callback: function(records, operation, success) {
                        if (success) {
                            me.expand();
                        }
                    }
                }, options);
                treeStore.load(options);
            }
        }
    });
});

Ext.data.association.HasMany.override({
    storeConfig: {
        autoDestroy: false
    }
});

Ext.data.reader.Reader({
    messageProperty: "message"
});

Ext.data.reader.Json.override({
    buildExtractors: function() {
        var me = this,
            _root;
        me.callParent(arguments);
        _root = me.getRoot;
        me.getRoot = function(root) {
            var data = _root(root);
            return Ext.isString(data) ? Ext.decode(data) : data;
        };
    }
});

Ext.data.writer.Writer.override({
    expandData: true,
    write: function(request) {
        var operation = request.operation,
            record, records = operation.records || [],
            len = records.length,
            i = 0,
            data = [];
        for (; i < len; i++) {
            record = records[i];
            if (this.filterRecord && this.filterRecord(record) === false) {
                continue;
            }
            data.push(this.getRecordData(record, operation));
        }
        return this.writeRecords(request, data);
    },
    isSimpleField: function(f) {
        var type = f && f.type ? f.type.type : "";
        return type === "int" || type === "float" || type === "boolean" || type === "date";
    },
    writeValue: function(data, field, record) {
        var name = field[this.nameProperty],
            dateFormat = this.dateFormat || field.dateWriteFormat || field.dateFormat,
            value = record.get(field.name);
        if (name == null) {
            name = field.name;
        }
        if (field.serialize) {
            data[name] = field.serialize(value, record);
        } else if (field.type === Ext.data.Types.DATE && dateFormat && Ext.isDate(value)) {
            data[name] = Ext.Date.format(value, dateFormat);
        } else {
            if (Ext.isEmpty(value, false) && this.isSimpleField(field)) {
                switch (field.submitEmptyValue) {
                    case "null":
                        data[name] = null;
                        break;
                    case "emptystring":
                        data[name] = "";
                        break;
                }
            } else {
                data[name] = this.htmlEncode || field.htmlEncode ? Ext.util.Format.htmlEncode(value) : value;
            }
        }
    },
    getRecordData: function(record, operation) {
        var isPhantom = record.phantom === true,
            writeAll = this.writeAllFields || isPhantom,
            fields = record.fields,
            fieldItems = fields.items,
            clientIdProperty = record.clientIdProperty,
            data = {},
            changes, field, key, value, mappedIdProperty, f, fLen;
        if (writeAll) {
            fLen = fieldItems.length;
            for (f = 0; f < fLen; f++) {
                field = fieldItems[f];
                if (this.filterField && this.filterField(record, field, field.name, record.get(field.name)) === false) {
                    continue;
                }
                if (field.persist) {
                    this.writeValue(data, field, record);
                }
            }
        } else {
            changes = record.getChanges();
            for (key in changes) {
                if (changes.hasOwnProperty(key)) {
                    field = fields.get(key);
                    if (this.filterField && this.filterField(record, field, key, changes[key]) === false) {
                        continue;
                    }
                    if (field.persist) {
                        this.writeValue(data, field, record);
                    }
                }
            }
        }
        if (isPhantom) {
            if (clientIdProperty && operation && operation.records.length > 1) {
                data[clientIdProperty] = record.internalId;
            }
        } else if (this.writeRecordId) {
            mappedIdProperty = fields.get(record.idProperty)[this.nameProperty] || record.idProperty;
            data[mappedIdProperty] = record.getId();
        }
        if ((this.excludeId && data.hasOwnProperty(record.idProperty)) || (this.skipIdForPhantomRecords !== false && data.hasOwnProperty(record.idProperty) && isPhantom)) {
            delete data[record.idProperty];
        }
        if (this.skipPhantomId && data.hasOwnProperty(record.clientIdProperty) && isPhantom) {
            delete data[record.clientIdProperty];
        }
        return data;
    }
});

Ext.data.writer.Json.override({
    allowSingle: false
});

Ext.define("Ext.data.proxy.OData", {
    extend: "Ext.data.proxy.Ajax",
    alternateClassName: "Ext.data.OData",
    alias: "proxy.odata",
    isODataProxy: true,
    enablePagingParams: true,
    appendAction: false,
    appendId: true,
    batchActions: false,
    buildUrl: function(request) {
        var me = this,
            operation = request.operation,
            records = operation.records || [],
            record = records[0],
            format = me.format,
            url = me.getUrl(request),
            params = request.params || {},
            id = record && !record.phantom ? record.getId() : operation.id;
        if (me.appendId && id) {
            if (url.match(/\/$/)) {
                url = url.substring(0, url.length - 1);
            }
            url = url + "(" + id + ")";
        }
        if (request.action == "read") {
            request.params = Ext.apply(request.params, {
                "$inlinecount": "allpages"
            });
        }
        if (format) {
            if (!url.match(/\.$/)) {
                url += ".";
            }
            url += format;
        }
        request.url = url;
        delete params[me.idParam];
        return me.callParent(arguments);
    },
    doRequest: function(operation, callback, scope) {
        this.sortParam = (scope.remoteSort ? "$orderby" : null);
        this.filterParam = (scope.remoteFilter ? "$filter" : null);
        this.startParam = (this.enablePagingParams ? "$skip" : null);
        this.limitParam = (this.enablePagingParams ? "$top" : null);
        this.getWriter().allowSingle = true;
        this.json = true;
        return this.callParent(arguments);
    },
    encodeSorters: function(sorters) {
        var min = [],
            length = sorters.length,
            i = 0;
        for (; i < length; i++) {
            min[i] = sorters[i].property;
            if (sorters[i].direction.toLowerCase() == "desc") {
                min[i] += " desc";
            }
        }
        return min.join(",");
    },
    encodeFilters: function(filters) {
        var filter = "",
            logical = "",
            length = filters.length,
            sq = "'",
            type = "",
            op = "",
            prop = "",
            val = "",
            item, i;
        for (i = 0; i < length; i++) {
            item = filters[i];
            type = item.type || "";
            logical = item.logical || "and";
            if (i > 0) {
                filter += " " + logical + " ";
            }
            switch (type) {
                case "int":
                case "bool":
                    type = "";
                    sq = "";
                    break;
                case "guid":
                    type = "guid";
                    sq = "'";
                    break;
                default:
                    type = "";
                    sq = "'";
                    break;
            }
            op = item.operator || "eq";
            prop = item.property;
            val = item.value;
            if (op == "like") {
                prop = "substringof('" + val + "', " + prop + ")";
                val = "true";
                op = "eq";
                sq = "";
            }
            filter += prop + " " + op + " " + type + sq + val + sq;
        }
        return filter;
    },
    processResponse: function(success, operation, request, response, callback, scope) {
        var me = this,
            action = operation.action;
        if (action === 'read' || action === 'create') {
            this.callParent(arguments);
        } else {
            if (response.status !== 204 && response.status !== 202 && response.status !== 1223) {
                operation.setException(response.statusText);
                me.fireEvent('exception', this, response, operation);
            } else {
                operation.commitRecords(operation.records || []);
                operation.setCompleted();
                operation.setSuccessful();
            }
            me.afterRequest(request, success);
            if (typeof callback == 'function') {
                callback.call(scope || me, operation);
            }
        }
    }
}, function() {
    Ext.apply(this.prototype, {
        actionMethods: {
            create: "POST",
            read: "GET",
            update: "PUT",
            destroy: "DELETE"
        },
        reader: {
            type: 'odata'
        },
        headers: {
            "Accept": "application/json"
        },
        pageParam: undefined,
        noCache: false
    });
});
Ext.define("Ext.data.reader.OData", {
    extend: "Ext.data.reader.Json",
    alias: "reader.odata",
    root: "value",
    totalProperty: "odata_count",
    read: function(response) {
        if (response && response.responseText == "") {
            return this.nullResultSet;
        }
        var data;
        if (response) {
            data = response.responseText ? this.getResponseData(response) : this.readRecords(response);
        }
        return data || this.nullResultSet;
    },
    getData: function(response) {
        if (!Ext.isDefined(response[this.root]) && !Ext.isDefined(response["odata.count"])) {
            var obj = {};
            obj[this.root] = Ext.isArray(response) ? response : [response];
            response = obj;
        }
        if (response && Ext.isDefined(response["odata.count"])) {
            response["odata_count"] = response["odata.count"];
        }
        return response;
    }
});

Ext.data.validations.length = function(config, value) {
    var length = value ? value.length : 0,
        min = config.min,
        max = config.max;
    if ((min && length < min) || (max && length > max)) {
        return false;
    } else {
        return true;
    }
}

Ext.view.AbstractView.override({
    initComponent: Ext.Function.createSequence(Ext.view.AbstractView.prototype.initComponent, function() {
        this.addEvents('beforeitemupdate', 'beforeitemremove');
    }),
    onUpdate: Ext.Function.createInterceptor(Ext.view.AbstractView.prototype.onUpdate, function(ds, record) {
        var me = this,
            index = me.dataSource.indexOf(record);
        me.fireEvent('beforeitemupdate', me, record, index);
    }),
    onRemove: Ext.Function.createInterceptor(Ext.view.AbstractView.prototype.onRemove, function(ds, records, indexes) {
        var i;
        for (i = indexes.length - 1; i >= 0; --i) {
            this.fireEvent('beforeitemremove', this, records[i], indexes[i]);
        }
    })
});

Ext.view.DropZone.override({
    getPosition: function(e, node) {
        var y = e.getXY()[1],
            regionEl = Ext.fly(node),
            region, pos;
        if (regionEl.hasCls("x-grid-wrap-row")) {
            regionEl = regionEl.down("tr.x-grid-data-row");
        }
        region = regionEl.getRegion();
        if ((region.bottom - y) >= (region.bottom - region.top) / 2) {
            pos = "before";
        } else {
            pos = "after";
        }
        return pos;
    },
    positionIndicator: function(node, data, e) {
        var me = this,
            view = me.view,
            pos = me.getPosition(e, node),
            overRecord = view.getRecord(node),
            draggingRecords = data.records,
            indicatorY;
        if (!Ext.Array.contains(draggingRecords, overRecord) && (pos == 'before' && !me.containsRecordAtOffset(draggingRecords, overRecord, -1) || pos == 'after' && !me.containsRecordAtOffset(draggingRecords, overRecord, 1))) {
            me.valid = true;
            if (me.overRecord != overRecord || me.currentPosition != pos) {
                nodeEl = Ext.fly(node);
                if (nodeEl.hasCls("x-grid-wrap-row")) {
                    nodeEl = nodeEl.down("tr.x-grid-data-row");
                }
                indicatorY = nodeEl.getY() - view.el.getY() - 1;
                if (pos == 'after') {
                    indicatorY += Ext.fly(nodeEl).getHeight();
                }
                me.getIndicator().setWidth(Ext.fly(view.el).getWidth()).showAt(0, indicatorY);
                me.overRecord = overRecord;
                me.currentPosition = pos;
            }
        } else {
            me.invalidateDrop();
        }
    }
});

Ext.view.Table.override({
    onUpdate: Ext.Function.createInterceptor(Ext.view.Table.prototype.onUpdate, function(store, record, operation, changedFieldNames) {
        var me = this,
            index;
        if (store.indexOf) {
            index = store.indexOf(record);
        } else if (record.parentNode) {
            index = record.parentNode.indexOf(record);
        }
        me.fireEvent('beforeitemupdate', me, record, index);
    }),
    processUIEvent: function(e) {
        if (this.stopEventFn && this.stopEventFn(this, e) === false) {
            return false;
        }
        return this.callParent(arguments);
    },
    moveColumn: function(fromIdx, toIdx, colsToMove) {
        var me = this,
            fragment = (colsToMove > 1) ? document.createDocumentFragment() : undefined,
            destinationCellIdx = toIdx,
            colCount = me.getGridColumns().length,
            lastIndex = colCount - 1,
            doFirstLastClasses = (me.firstCls || me.lastCls) && (toIdx === 0 || toIdx == colCount || fromIdx === 0 || fromIdx == lastIndex),
            i, j, rows, len, tr, cells, tables;
        if (me.rendered && toIdx !== fromIdx) {
            rows = me.el.query(me.getDataRowSelector());
            if (me.panel && me.panel.getRowExpander && me.panel.getRowExpander()) {
                rows = Ext.Array.filter(rows, function(item) {
                    return !Ext.fly(item).findParent("div.x-grid-rowbody", me.el);
                });
            }
            if (toIdx > fromIdx && fragment) {
                destinationCellIdx -= colsToMove;
            }
            for (i = 0, len = rows.length; i < len; i++) {
                tr = rows[i];
                cells = tr.childNodes;
                if (doFirstLastClasses) {
                    if (cells.length === 1) {
                        Ext.fly(cells[0]).addCls(me.firstCls);
                        Ext.fly(cells[0]).addCls(me.lastCls);
                        continue;
                    }
                    if (fromIdx === 0) {
                        Ext.fly(cells[0]).removeCls(me.firstCls);
                        Ext.fly(cells[1]).addCls(me.firstCls);
                    } else if (fromIdx === lastIndex) {
                        Ext.fly(cells[lastIndex]).removeCls(me.lastCls);
                        Ext.fly(cells[lastIndex - 1]).addCls(me.lastCls);
                    }
                    if (toIdx === 0) {
                        Ext.fly(cells[0]).removeCls(me.firstCls);
                        Ext.fly(cells[fromIdx]).addCls(me.firstCls);
                    } else if (toIdx === colCount) {
                        Ext.fly(cells[lastIndex]).removeCls(me.lastCls);
                        Ext.fly(cells[fromIdx]).addCls(me.lastCls);
                    }
                }
                if (fragment) {
                    for (j = 0; j < colsToMove; j++) {
                        fragment.appendChild(cells[fromIdx]);
                    }
                    tr.insertBefore(fragment, cells[destinationCellIdx] || null);
                } else {
                    tr.insertBefore(cells[fromIdx], cells[destinationCellIdx] || null);
                }
            }
            tables = me.el.query(me.getBodySelector());
            for (i = 0, len = tables.length; i < len; i++) {
                tr = tables[i];
                if (fragment) {
                    for (j = 0; j < colsToMove; j++) {
                        fragment.appendChild(tr.childNodes[fromIdx]);
                    }
                    tr.insertBefore(fragment, tr.childNodes[destinationCellIdx] || null);
                } else {
                    tr.insertBefore(tr.childNodes[fromIdx], tr.childNodes[destinationCellIdx] || null);
                }
            }
        }
    },
    getFeature: function(id) {
        var f = this.callParent(arguments);
        if (!f) {
            var features = this.featuresMC;
            if (features) {
                return features.getAt(features.findIndex("proxyId", id));
            }
        }
        return f;
    },
    hasActiveGrouping: function() {
        return this.isGrouping && this.store.isGrouped();
    },
    getRecord: function(node) {
        var me = this,
            record, recordIndex;
        if (me.store.isDestroyed) {
            return;
        }
        node = me.getNode(node);
        if (node) {
            if (!me.hasActiveGrouping()) {
                recordIndex = node.getAttribute('data-recordIndex');
                if (recordIndex) {
                    recordIndex = parseInt(recordIndex, 10);
                    if (recordIndex > -1) {
                        return me.store.data.getAt(recordIndex);
                    }
                }
            }
            record = me.store.getByInternalId(node.getAttribute('data-recordId'));
            if (!record) {
                record = this.dataSource.data.get(node.getAttribute('data-recordId'));
            }
            return record;
        }
    },
    indexInStore: function(node) {
        node = (node && node.isCollapsedPlaceholder) ? this.getNode(node) : this.getNode(node, false);
        if (!node && node !== 0) {
            return -1;
        }
        var recordIndex = node.getAttribute('data-recordIndex');
        if (recordIndex) {
            return parseInt(recordIndex, 10);
        }
        return this.dataSource.indexOf(this.getRecord(node));
    },
    getRowStyleTableElOriginal: Ext.view.Table.prototype.getRowStyleTableEl,
    getRowStyleTableEl: function() {
        var el = this.getRowStyleTableElOriginal.apply(this, arguments);
        if (!el) {
            el = {
                addCls: Ext.emptyFn,
                removeCls: Ext.emptyFn,
                tagName: {}
            }
        }
        return el;
    },
    renderRow: function(record, rowIdx, out) {
        var me = this,
            isMetadataRecord = rowIdx === -1,
            selModel = me.selModel,
            rowValues = me.rowValues,
            itemClasses = rowValues.itemClasses,
            rowClasses = rowValues.rowClasses,
            cls, rowTpl = me.rowTpl;
        rowValues.record = record;
        rowValues.recordId = record.internalId;
        rowValues.recordIndex = rowIdx;
        rowValues.rowId = me.getRowId(record);
        rowValues.itemCls = rowValues.rowCls = '';
        if (!rowValues.columns) {
            rowValues.columns = me.ownerCt.columnManager.getColumns();
        }
        itemClasses.length = rowClasses.length = 0;
        if (!isMetadataRecord) {
            itemClasses[0] = Ext.baseCSSPrefix + "grid-row";
            if (selModel && selModel.isRowSelected) {
                if ((rowIdx + 1) < selModel.store.getTotalCount()) {
                    if (selModel.isRowSelected(rowIdx + 1)) {
                        itemClasses.push(me.beforeSelectedItemCls);
                    }
                }
                if (selModel.isRowSelected(record)) {
                    itemClasses.push(me.selectedItemCls);
                }
            }
            if (me.stripeRows && rowIdx % 2 !== 0) {
                rowClasses.push(me.altRowCls);
            }
            if (me.getRowClass) {
                cls = me.getRowClass(record, rowIdx, null, me.dataSource);
                if (cls) {
                    rowClasses.push(cls);
                }
            }
        }
        if (out) {
            rowTpl.applyOut(rowValues, out);
        } else {
            return rowTpl.apply(rowValues);
        }
    }
});

Ext.view.TableLayout.override({
    setColumnWidths: function(ownerContext) {
        var me = this,
            owner = me.owner,
            context = ownerContext.context,
            columns = me.headerCt.getVisibleGridColumns(),
            column, i = 0,
            len = columns.length,
            tableWidth = 0,
            columnLineWidth = 0,
            childContext, colWidth, isContentBox = !Ext.isBorderBox;
        if (context) {
            context.currentLayout = me;
        }
        for (i = 0; i < len; i++) {
            column = columns[i];
            childContext = context.getCmp(column);
            colWidth = childContext.props.width;
            if (isNaN(colWidth)) {
                childContext.getProp('width');
                return false;
            }
            tableWidth += colWidth;
            if (isContentBox && owner.columnLines) {
                if (!columnLineWidth) {
                    columnLineWidth = context.getCmp(column).borderInfo.width || 1;
                }
                colWidth -= columnLineWidth;
            }
            owner.body.select(owner.getColumnSizerSelector(column)).setWidth(colWidth);
        }
        if (me.owner.panel && me.owner.panel.getRowExpander && me.owner.panel.getRowExpander()) {
            owner.el.select(owner.getBodySelector()).filter(function(tableEl) {
                return !tableEl.findParent("div.x-grid-rowbody", owner.el);
            }).setWidth(tableWidth);
        } else {
            owner.el.select(owner.getBodySelector()).setWidth(tableWidth);
        }
        return true;
    }
});

Ext.view.View.override({
    initComponent: Ext.Function.createInterceptor(Ext.view.View.prototype.initComponent, function() {
        this.plugins = this.plugins || [];
        this.plugins.push(Ext.create('Ext.view.plugin.SelectionSubmit', {}));
    }),
    getRowsValues: function(config) {
        if (Ext.isBoolean(config)) {
            config = {
                selectedOnly: config
            };
        }
        config = config || {};
        var records = (config.selectedOnly === true ? this.getSelectionModel().getSelection() : this.store.getRange()) || [],
            values = [],
            dataR, idProp = this.store.proxy.reader.getIdProperty(),
            i;
        for (i = 0; i < records.length; i++) {
            if (Ext.isEmpty(records[i])) {
                continue;
            }
            dataR = Ext.apply({}, records[i].data);
            if (idProp && dataR.hasOwnProperty(idProp)) {
                dataR[idProp] = records[i].getId();
            }
            dataR = this.store.prepareRecord(dataR, records[i], config);
            if (!Ext.isEmptyObj(dataR)) {
                values.push(dataR);
            }
        }
        return values;
    },
    submitData: function(config) {
        this.store._submit(this.getRowsValues(config));
    },
    handleMouseOverOrOut: function(e) {
        var me = this,
            isMouseout = e.type === 'mouseout',
            method = isMouseout ? e.getRelatedTarget : e.getTarget,
            nowOverItem = method.call(e, me.itemSelector) || method.call(e, me.dataRowSelector);
        if (!me.mouseOverItem || nowOverItem !== me.mouseOverItem) {
            if (me.el.contains(me.mouseOverItem) || !me.store.buffered) {
                if (me.mouseOverItem) {
                    e.item = me.mouseOverItem;
                    e.newType = 'mouseleave';
                    me.handleEvent(e);
                }
            }
            if (me.el.contains(nowOverItem) || !me.store.buffered) {
                me.mouseOverItem = nowOverItem;
                if (me.mouseOverItem) {
                    e.item = me.mouseOverItem;
                    e.newType = 'mouseenter';
                    me.handleEvent(e);
                }
            }
        }
    }
});

Ext.define('Ext.view.plugin.SelectionSubmit', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.viewselectionsubmit',
    init: function(view) {
        var me = this;
        view.getSelectionSubmit = function() {
            return me;
        };
        if (view instanceof Ext.view.Table || view instanceof Ext.view.BoundList) {
            return;
        }
        this.view = view;
        this.store = view.store;
        this.initSelection();
    },
    initSelection: function() {
        this.hField = this.getSelectionModelField();
        if (this.view.hasId() && this.view.selectionSubmit !== false) {
            this.view.on("selectionchange", this.updateSelection, this, {
                buffer: 10
            });
            this.store.on("clear", this.clearField, this);
        }
        this.view.on("viewready", function() {
            if (this.view.hasId() && this.view.selectionSubmit !== false) {
                this.getSelectionModelField().render(this.view.el.parent() || this.view.el);
            }
            this.initSelectionData();
        }, this);
    },
    clearField: function() {
        this.getSelectionModelField().setValue("");
    },
    getSelectionModelField: function() {
        if (!this.hField) {
            this.hField = new Ext.form.Hidden({
                name: this.view.id
            });
        }
        return this.hField;
    },
    destroy: function() {
        if (this.hField) {
            this.hField.destroy();
        }
    },
    doSelection: function() {
        var view = this.view,
            store = this.store,
            selModel = view.getSelectionModel(),
            data = view.selectedData;
        if (!Ext.isEmpty(data)) {
            selModel.suspendChanges();
            var records = [],
                record;
            for (var i = 0; i < data.length; i++) {
                if (!Ext.isEmpty(data[i].recordID)) {
                    record = store.getById(data[i].recordID);
                    if (!record && Ext.isNumeric(data[i].recordID)) {
                        record = store.getById(parseInt(data[i].recordID, 10));
                    }
                } else if (!Ext.isEmpty(data[i].rowIndex)) {
                    record = store.getAt(data[i].rowIndex);
                }
                if (!Ext.isEmpty(record)) {
                    records.push(record);
                }
            }
            selModel.select(records);
            this.updateSelection();
            selModel.resumeChanges();
            delete selModel.selectedData;
        }
    },
    updateSelection: function() {
        var view = this.view,
            store = this.store,
            selModel = view.getSelectionModel(),
            rowIndex, selectedRecords, records = [];
        if (this.view.selectionSubmit === false) {
            return;
        }
        selectedRecords = selModel.getSelection();
        for (var i = 0; i < selectedRecords.length; i++) {
            rowIndex = store.indexOfId(selectedRecords[i].getId());
            records.push({
                RecordID: selectedRecords[i].getId(),
                RowIndex: rowIndex
            });
        }
        this.hField.setValue(Ext.encode(records));
    },
    initSelectionData: function() {
        if (this.store && this.view.viewReady) {
            if (this.store.getCount() > 0) {
                Ext.defer(this.doSelection, 100, this);
            } else {
                this.store.on("load", this.doSelection, this, {
                    single: true,
                    delay: 100
                });
            }
        }
    }
});

Ext.view.BoundList.override({
    initComponent: Ext.Function.createSequence(Ext.view.BoundList.prototype.initComponent, function() {
        var cfg = this.initialConfig;
        if (cfg) {
            if (cfg.itemCls) {
                this.itemCls = cfg.itemCls;
            }
            if (cfg.selectedItemCls) {
                this.selectedItemCls = cfg.selectedItemCls;
            }
            if (cfg.overItemCls) {
                this.overItemCls = cfg.overItemCls;
            }
            if (cfg.itemSelector) {
                this.itemSelector = cfg.itemSelector;
            }
        }
    })
});

Ext.panel.Table.override({
    processEvent: function(type, view, cell, recordIndex, cellIndex, e, record, row) {
        var me = this,
            header;
        if (this.ignoreTargets) {
            var i;
            for (i = 0; i < this.ignoreTargets.length; i++) {
                if (e.getTarget(this.ignoreTargets[i])) {
                    return false;
                }
            }
        }
        if (cellIndex !== -1) {
            header = me.columnManager.getColumns()[cellIndex];
            return header && header.processEvent.apply(header, arguments);
        }
    },
    beforeDestroy: function() {
        if (this.editors) {
            Ext.destroy(this.editors);
        }
        this.callParent(arguments);
    },
    hasLockedColumns: function(columns) {
        if (Ext.isObject(columns)) {
            columns = columns.items;
        }
        var i, len = columns ? columns.length : 0,
            column;
        for (i = 0; i < len; i++) {
            column = columns[i];
            if (!column.processed && column.locked) {
                return true;
            }
        }
    },
    insertColumn: function(index, newCol, doLayout) {
        var headerCt = this.normalGrid ? this.normalGrid.headerCt : this.headerCt;
        if (index < 0) {
            index = 0;
        }
        if (newCol.locked && this.lockedGrid) {
            headerCt = this.lockedGrid.headerCt;
        }
        headerCt.insert(index, newCol);
        if (doLayout !== false) {
            this.updateLayout();
            this.fireEvent('reconfigure', this);
            this.getView().refresh();
        }
    },
    addColumn: function(newCol, doLayout) {
        var headerCt = this.normalGrid ? this.normalGrid.headerCt : this.headerCt;
        if (newCol.locked && this.lockedGrid) {
            headerCt = this.lockedGrid.headerCt;
        }
        this.insertColumn(headerCt.getColumnCount(), newCol, doLayout);
    },
    removeColumn: function(index, doLayout) {
        var headerCt = this.normalGrid ? this.normalGrid.headerCt : this.headerCt,
            column, locked = false;
        column = headerCt.getComponent(index);
        if (!column && this.lockedGrid) {
            headerCt = this.lockedGrid.headerCt;
            column = headerCt.getComponent(index);
            locked = true;
        }
        if (column) {
            headerCt.remove(column);
            if (doLayout !== false) {
                if (locked) {
                    this.syncLockedWidth();
                    this.lockedGrid.getView().refresh();
                }
                this.updateLayout();
                this.fireEvent('reconfigure', this);
                this.getView().refresh();
            }
        }
    },
    removeAllColumns: function(doLayout) {
        var headerCt = this.normalGrid ? this.normalGrid.headerCt : this.headerCt;
        headerCt.removeAll();
        if (this.lockedGrid) {
            this.lockedGrid.headerCt.removeAll();
        }
        if (doLayout !== false) {
            this.updateLayout();
            this.fireEvent('reconfigure', this);
            this.getView().refresh();
        }
    }
});

Ext.grid.Panel.override({
    selectionSubmit: true,
    selectionMemory: true,
    selectionMemoryEvents: true,
    getFilterPlugin: function() {
        if (this.lockedGrid) {
            Ext.log({
                msg: Ext.String.format("You are calling the getFilterPlugin method on a locking grid ({0}). Please use grid.normalGrid.getFilterPlugin() to get a filter plugin of a normal grid and grid.lockedGrid.getFilterPlugin() for a locked grid", this.id),
                level: "warn"
            });
        }
        if (this.features && Ext.isArray(this.features)) {
            for (var i = 0; i < this.features.length; i++) {
                if (this.features[i].isGridFiltersPlugin) {
                    return this.features[i];
                }
            }
        } else {
            if (this.features && this.features.isGridFiltersPlugin) {
                return this.features;
            }
        }
    },
    getFeature: function(name) {
        if (this.lockedGrid) {
            Ext.log({
                msg: Ext.String.format("You are calling the getFeature method on a locking grid ({0}). Please use grid.normalGrid.getFeature() to get a filter plugin of a normal grid and grid.lockedGrid.getFeature() for a locked grid", this.id),
                level: "warn"
            });
        }
        name = "feature." + name;
        if (this.features && Ext.isArray(this.features)) {
            for (var i = 0; i < this.features.length; i++) {
                if (this.features[i].alias == name) {
                    return this.features[i];
                }
            }
        } else {
            if (this.features && this.features.alias == name) {
                return this.features;
            }
        }
    },
    getRowEditor: function() {
        return this.editingPlugin;
    },
    getRowExpander: function() {
        if (this.plugins && Ext.isArray(this.plugins)) {
            for (var i = 0; i < this.plugins.length; i++) {
                if (this.plugins[i].isRowExpander) {
                    return this.plugins[i];
                }
            }
        } else {
            if (this.plugins && this.plugins.isRowExpander) {
                return this.plugins;
            }
        }
    },
    initComponent: function() {
        this.plugins = this.plugins || [];
        if (!Ext.isArray(this.plugins)) {
            this.plugins = [this.plugins];
        }
        if (this.selectionMemory) {
            this.initSelectionMemory();
        }
        this.initSelectionSubmit();
        this.callParent(arguments);
        if (this.lockable) {
            p = this.lockedGrid.getSelectionSubmit();
            Ext.Array.remove(this.lockedGrid.plugins, p);
            if (Ext.isFunction(p.destroy)) {
                p.destroy();
            }
            if (this.selectionMemory) {
                p = this.lockedGrid.getSelectionMemory();
                Ext.Array.remove(this.lockedGrid.plugins, p);
                if (Ext.isFunction(p.destroy)) {
                    p.destroy();
                }
            }
        }
    },
    initSelectionSubmit: function() {
        this.plugins.push(Ext.create('Ext.grid.plugin.SelectionSubmit', {}));
    },
    initSelectionMemory: function() {
        this.plugins.push(Ext.create('Ext.grid.plugin.SelectionMemory', {}));
    },
    clearMemory: function() {
        if (this.selectionMemory) {
            this.getSelectionMemory().clearMemory();
        }
    },
    doSelection: function() {
        this.getSelectionSubmit().doSelection();
    },
    initSelectionData: function() {
        this.getSelectionSubmit().initSelectionData();
    },
    getRowsValues: function(config) {
        config = config || {};
        if (this.isEditable && this.editingPlugin) {
            this.editingPlugin.completeEdit();
        }
        var records = (config.selectedOnly ? this.selModel.getSelection() : config.currentPageOnly ? this.store.getRange() : this.store.getAllRange()) || [],
            values = [],
            record, sIds, i, idProp = this.store.proxy.reader.getIdProperty();
        if (this.selectionMemory && config.selectedOnly && !config.currentPageOnly && this.store.isPagingStore) {
            records = [];
            sIds = this.getSelectionMemory().selectedIds;
            for (var id in sIds) {
                if (sIds.hasOwnProperty(id)) {
                    record = this.store.getById(sIds[id].id);
                    if (!Ext.isEmpty(record)) {
                        records.push(record);
                    }
                }
            }
        }
        for (i = 0; i < records.length; i++) {
            var obj = {},
                dataR;
            dataR = Ext.apply(obj, records[i].data);
            if (idProp && dataR.hasOwnProperty(idProp)) {
                dataR[idProp] = config.excludeId === true ? undefined : records[i].getId();
            }
            config.grid = this;
            dataR = this.store.prepareRecord(dataR, records[i], config);
            if (!Ext.isEmptyObj(dataR)) {
                values.push(dataR);
            }
        }
        return values;
    },
    serialize: function(config) {
        return Ext.encode(this.getRowsValues(config));
    },
    submitData: function(config, requestConfig) {
        config = config || {};
        config.selectedOnly = config.selectedOnly || false;
        encode = config.encode;
        var values = this.getRowsValues(config);
        if (!values || values.length === 0) {
            return false;
        }
        if (encode) {
            values = Ext.util.Format.htmlEncode(values);
            delete config.encode;
        }
        this.store._submit(values, config, requestConfig);
    },
    deleteSelected: function() {
        var selection = this.getSelectionModel().getSelection();
        if (selection && selection.length > 0) {
            this.store.remove(selection);
        }
    },
    hasSelection: function() {
        return this.getSelectionModel().hasSelection();
    },
    print: function(config) {
        Ext.net.GridPrinter.print(this, config);
    }
});

Ext.selection.CellModel.override({
    deselectAll: function(suppressEvent) {
        this.setCurrentPosition();
    }
});

Ext.selection.RowModel.override({
    getCurrentPosition: function(view) {
        var firstSelection = this.selected.items[0];
        if (firstSelection) {
            return new Ext.grid.CellContext(view || this.view).setPosition(this.store.indexOf(firstSelection), 0);
        }
    },
    onEditorTab: function(editingPlugin, e) {
        var me = this,
            view = editingPlugin.context.view,
            record = editingPlugin.getActiveRecord(),
            header = editingPlugin.getActiveColumn(),
            position = view.getPosition(record, header),
            direction = e.shiftKey ? 'left' : 'right';
        do {
            position = view.walkCells(position, direction, e, me.preventWrap);
        } while (position && (!position.columnHeader.getEditor(record) || !editingPlugin.startEditByPosition(position)));
    }
});

Ext.selection.TreeModel.override({
    onKeyUp: function(e) {
        var me = this,
            view = me.views[0],
            idx = me.store.indexOf(me.lastFocused),
            visIdx, record;
        if (idx > 0) {
            record = me.store.getAt(idx - 1);
            visIdx = idx - 1;
            while (visIdx > 0 && record.data.hidden) {
                record = me.store.getAt(--visIdx);
            }
            if (record.data.hidden) {
                return;
            }
            if (e.shiftKey && me.lastFocused) {
                if (me.isSelected(me.lastFocused) && me.isSelected(record)) {
                    me.doDeselect(me.lastFocused, true);
                    me.setLastFocused(record);
                } else if (!me.isSelected(me.lastFocused)) {
                    me.doSelect(me.lastFocused, true);
                    me.doSelect(record, true);
                } else {
                    me.doSelect(record, true);
                }
            } else if (e.ctrlKey) {
                me.setLastFocused(record);
            } else {
                me.doSelect(record);
            }
        }
    },
    onKeyDown: function(e) {
        var me = this,
            view = me.views[0],
            idx = me.store.indexOf(me.lastFocused),
            visIdx, record;
        if (idx + 1 < me.store.getCount()) {
            record = me.store.getAt(idx + 1);
            visIdx = idx + 1;
            while ((visIdx + 1 < me.store.getCount()) && record.data.hidden) {
                record = me.store.getAt(++visIdx);
            }
            if (record.data.hidden) {
                return;
            }
            if (me.selected.getCount() === 0) {
                if (!e.ctrlKey) {
                    me.doSelect(record);
                } else {
                    me.setLastFocused(record);
                }
            } else if (e.shiftKey && me.lastFocused) {
                if (me.isSelected(me.lastFocused) && me.isSelected(record)) {
                    me.doDeselect(me.lastFocused, true);
                    me.setLastFocused(record);
                } else if (!me.isSelected(me.lastFocused)) {
                    me.doSelect(me.lastFocused, true);
                    me.doSelect(record, true);
                } else {
                    me.doSelect(record, true);
                }
            } else if (e.ctrlKey) {
                me.setLastFocused(record);
            } else {
                me.doSelect(record);
            }
        }
    }
});

Ext.selection.CheckboxModel.override({
    constructor: function(config) {
        this.callParent(arguments);
        if (this.rowspan) {
            this.renderer = Ext.Function.bind(this.renderer, this);
        }
    },
    renderer: function(value, metaData, record, rowIndex, colIndex, store, view) {
        if (this.rowspan) {
            metaData.tdAttr = 'rowspan="' + this.rowspan + '"';
        }
        metaData.tdCls = Ext.baseCSSPrefix + 'grid-cell-special ' + Ext.baseCSSPrefix + 'grid-cell-row-checker';
        return '<div class="' + Ext.baseCSSPrefix + 'grid-row-checker">&#160;</div>';
    }
});

Ext.grid.RowEditor.override({
    addFieldsForColumn: function(column, initial) {
        var me = this,
            i, length, field;
        if (Ext.isArray(column)) {
            for (i = 0, length = column.length; i < length; i++) {
                me.addFieldsForColumn(column[i], initial);
            }
            return;
        }
        if (column.getEditor) {
            field = column.getEditor(null, {
                xtype: 'displayfield',
                getModelData: function() {
                    return null;
                }
            });
            if (column.align === 'right') {
                field.fieldStyle = 'text-align:right';
            }
            if (column.xtype === 'actioncolumn') {
                field.fieldCls += ' ' + Ext.baseCSSPrefix + 'form-action-col-field'
            }
            if (me.isVisible() && me.context) {
                if (field.is('displayfield')) {
                    me.renderColumnData(field, me.context.record, column);
                } else {
                    field.suspendEvents();
                    field.setValue(me.context.record.get(column.dataIndex));
                    field.resumeEvents();
                }
            }
            if (column.hidden) {
                me.onColumnHide(column);
            } else if (column.rendered && !initial) {
                me.onColumnShow(column);
            }
            me.mon(field, 'change', me.onFieldChange, me);
        }
    }
});

Ext.define("Ext.net.GridPrinter", {
    requires: 'Ext.XTemplate',
    statics: {
        title: "",
        printStyle: "html,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,h5,h6,pre,form,fieldset,input,p,blockquote,th,td{margin:0;padding:0}html,img,body{border:0}address,caption,cite,code,dfn,em,strong,th,var{font-style:normal;font-weight:400}ol,ul{list-style:none}caption,th{text-align:left}h1,h2,h3,h4,h5,h6{font-size:100%}q:before,q:after{content:''}table{width:100%;text-align:left;font-size:11px;font-family:arial;border-collapse:collapse;table-layout:fixed;}table th{font-weight:700;padding:4px 3px 4px 5px;border:1px solid #d0d0d0;border-left-color:#eee;background-color:#ededed}table tr.odd{background-color:#fff}table tr.even{background-color:#f9f9f9}table td{padding:4px 3px 4px 5px;border-style:none solid solid;border-width:1px;border-color:#ededed;text-overflow: ellipsis;overflow:hidden;white-space:nowrap;}@media print{body{margin:0;padding:0}}.group-header{border-bottom:2px solid #000;font-size:14px;}.group-header td{padding-top:15px;}",
        headerTpl: ['<tpl for=".">', '<th>{text}</th>', '</tpl>'],
        bodyTpl: ['<tpl for=".">', '<tpl if="values.dataIndex">', '<td>\{{[Ext.String.createVarName(values.dataIndex)]}\}</td>', '<tpl else>', '<td>\{{[Ext.String.createVarName(values.id)]}\}</td>', '</tpl>', '</tpl>'],
        print: function(grid, config) {
            if (!grid) {
                throw "Grid is undefined";
            }
            config = config || {};
            var groupingFeature = grid.groupingFeature,
                groupField = groupingFeature && groupingFeature.getGroupField(),
                isGrouped = grid.store.isGrouped(),
                rowBodyFeature = grid.view.rowBodyFeature,
                rowBody, columns = grid.headerCt.getGridColumns(),
                data, resPath, stylesheets, parent_ss, tableHeader, body;
            columns = this.getColumns(columns);
            columns = this.filterColumns(columns, isGrouped, groupField, config);
            data = this.convertData(grid, columns, config);
            resPath = Ext.net.ResourceMgr.cdnPath || Ext.net.ResourceMgr.resourcePath;
            stylesheets = [];
            stylesheets = stylesheets.concat(this.stylesheets || []);
            stylesheets = stylesheets.concat(config.stylesheets || []);
            if (this.get("copyStylesheets", config) !== false) {
                parent_ss = this.getStylesheets();
            }
            tableHeader = this.getTableHeader(columns);
            if (rowBodyFeature && this.get("ignoreRowBody", config) !== true) {
                rowBody = this.getRowBody(rowBodyFeature, columns);
            }
            body = this.getBody(grid, columns, data, rowBody);
            this.doPrint(this.getHtml(grid, parent_ss, tableHeader, body, rowBody, isGrouped, config, columns, {
                data: data,
                stylesheets: stylesheets,
                title: grid.title || this.title
            }));
        },
        getColumns: function(gridColumns) {
            var i, c, len, columns = [];
            for (i = 0, len = gridColumns.length; i < len; i++) {
                c = gridColumns[i];
                if (c.items.length > 0) {
                    columns = columns.concat(c.items.items);
                } else {
                    columns.push(c);
                }
            }
            return columns;
        },
        filterColumns: function(columns, isGrouped, groupField, config) {
            var temp = [],
                i, len, result, c, includeHidden = this.get("includeHidden", config),
                includeGroupField = this.get("includeGroupField", config),
                columnFilter = this.get("columnFilter", config),
                columnFilterScope = this.get("columnFilterScope", config);
            for (i = 0, len = columns.length; i < len; i++) {
                c = columns[i];
                if (columnFilter) {
                    result = columnFilter.call(columnFilterScope, c);
                    if (Ext.isDefined(result)) {
                        if (result === true) {
                            temp.push(c);
                        }
                        continue;
                    }
                }
                if (c.isXType("commandcolumn") || c.isXType("componentcolumn") || c.isXType("imagecommandcolumn") || c.isXType("actioncolumn")) {
                    continue;
                }
                if (c.dataIndex && (!c.hidden || includeHidden) && (!isGrouped || c.dataIndex !== groupField || includeGroupField)) {
                    temp.push(c);
                } else if (c.isXType("templatecolumn")) {
                    temp.push(c);
                } else if (c.isXType("rownumberer")) {
                    c.text = "№";
                    temp.push(c);
                }
            }
            return temp;
        },
        convertData: function(grid, columns, config) {
            var data = [];
            Ext.each(this.get("currentPageOnly", config) ? grid.store.getRange() : grid.store.getAllRange(), function(record, index) {
                var item = Ext.apply({}, record.data),
                    i, len, c, meta, value;
                for (i = 0, len = columns.length; i < len; i++) {
                    c = columns[i];
                    if (c.dataIndex) {
                        value = record.data[c.dataIndex];
                        meta = {
                            tdCls: "",
                            tdAttr: "",
                            style: ""
                        };
                        value = c.renderer ? c.renderer.call(grid, value, meta, record, index, i, grid.store, grid.view) : value;
                        item[Ext.String.createVarName(c.dataIndex)] = value;
                    } else if (c.isXType("rownumberer")) {
                        meta = {
                            tdCls: "",
                            tdAttr: "",
                            style: ""
                        };
                        item[Ext.String.createVarName(c.id)] = c.renderer.call(grid, null, meta, record, index, i, grid.store, grid.view);
                    } else if (column.isXType("templatecolumn")) {
                        value = c.tpl ? c.tpl.apply(record.data) : value;
                        item[Ext.String.createVarName(c.id)] = value;
                    }
                }
                item.__internalId = record.internalId;
                data.push(item);
            });
            return data;
        },
        getStylesheets: function() {
            var doc_ss = document.styleSheets,
                ss, parent_ss = [],
                i, g, len;
            for (i = 0; i < doc_ss.length; i++) {
                ss = doc_ss[i];
                if (ss.id == "ext-theme" || ss.id == "extnet-styles" || ss.id == "extnet-resetstyles" || ss.id == "extnet-resources") {
                    continue;
                }
                if (!Ext.isIE) {
                    try {
                        for (g = 0, len = ss.cssRules.length; g < len; g++) {
                            parent_ss.push(ss.cssRules[g].cssText);
                        }
                    } catch (e) {}
                } else {
                    parent_ss.push(ss.cssText);
                }
            }
            return parent_ss.join("");
        },
        getRowBody: function(rowBodyFeature, columns) {
            return '{[ this.getBodyContent(this.view, values, xindex, this.colSpan) ]}';
        },
        getBodyContent: function(view, data, index, colSpan) {
            var values = {};
            view.rowBodyFeature.setupRowData(data.__internalId ? view.store.getByInternalId(data.__internalId) : data, index, values);
            return (['<td colspan="' + colSpan + '" class="' + (values.rowBodyCls || "") + '">', '<div class="x-grid-rowbody ' + (values.rowBodyDivCls || "") + '">' + (values.rowBody || "") + '</div>', '</td>'].join(""));
        },
        get: function(name, config) {
            return Ext.isDefined(config[name]) ? config[name] : this[name];
        },
        doPrint: function(html) {
            var win = window.open('', 'printgrid');
            win.document.open();
            win.document.write(html);
            win.document.close();
            win.print();
            win.close();
        },
        getTableHeader: function(columns) {
            return Ext.create('Ext.XTemplate', this.headerTpl).apply(columns);
        },
        getTableDefinition: function(grid, columns, config) {
            var buffer = ["<table"],
                gridWidth = this.get("gridWidth", config),
                columnsWidth = this.get("columnsWidth", config);
            if (!Ext.isDefined(gridWidth) && columnsWidth) {
                gridWidth = true;
            }
            if (gridWidth) {
                buffer.push(" style=\"width:");
                buffer.push(grid.getWidth());
                buffer.push("px;\"");
            }
            buffer.push(">");
            if (columnsWidth) {
                for (var i = 0; i < columns.length; i++) {
                    buffer.push("<colgroup><col style=\"width: ");
                    buffer.push(columns[i].getWidth());
                    buffer.push("px;\"></colgroup>");
                }
            }
            return buffer.join("");
        },
        getHtml: function(grid, styles, headers, body, rowBody, isGrouped, config, columns, data) {
            var printStyle = this.get("printStyle", config),
                userStyle = this.get("userStyle", config),
                stylesheets = Ext.create('Ext.XTemplate', ['<tpl for=".">', '<link href="{.}" rel="stylesheet" type="text/css" media="screen,print" />', '</tpl>', ]).apply(data.stylesheets),
                tableDefinition = this.getTableDefinition(grid, columns, config),
                table = isGrouped ? [tableDefinition, '<tr>', headers, '</tr>', body, '</table>'].join("") : Ext.create('Ext.XTemplate', [tableDefinition, '<tr>', headers, '</tr>', '<tpl for=".">', '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">', body, '</tr>', '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">', (rowBody || ""), '</tr>', '</tpl>', '</table>', {
                    view: grid.view,
                    getBodyContent: this.getBodyContent,
                    colSpan: columns.length
                }]).apply(data.data);
            return ['<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">', '<html>', '<head>', '<meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />', '<title>' + (data.title || "") + '</title>', (stylesheets || ""), '<style type="text/css">', (styles || ""), (printStyle || ""), (userStyle || ""), '</style>', '</head>', '<body>', (this.get("beforeBody", config) || ""), (table || ""), (this.get("afterBody", config) || ""), '</body>', '</html>'].join("");
        },
        getBody: function(grid, columns, data, rowBody) {
            var groups, fields = grid.store.getProxy().getModel().getFields(),
                groupField, header, feature, body;
            if (grid.store.isGrouped()) {
                groups = grid.store.getGroups();
                feature = grid.groupingFeature;
                header = feature.refreshData.header;
                groupField = feature.getGroupField();
                grouper = grid.view.store.groupers.first();
                if (!fields || !groupField) {
                    return;
                }
                var bodyTpl = ['<tpl for=".">', '<tr class="group-header">', '<td colspan="{[this.colSpan]}">', (feature.groupHeaderTpl.html || ''), '</td>', '</tr>', '<tpl for="children">', '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">', '<tpl for="this.columns">', '<td>', '{[ this.getValue(parent, Ext.String.createVarName(values.dataIndex || values.id)) ]}', '</td>', '</tpl>', '</tr>', '<tr class="{[xindex % 2 === 0 ? "even" : "odd"]}">', (rowBody || ""), '</tr>', '</tpl>', '</tpl>', {
                    getBodyContent: this.getBodyContent,
                    view: grid.view,
                    columns: columns,
                    fields: fields,
                    colSpan: columns.length,
                    getValue: function(record, name) {
                        return record.convertedData[name];
                    }
                }];
                Ext.each(groups, function(group) {
                    group.groupField = groupField;
                    group.groupValue = group.children[0].get(groupField);
                    group.columnName = header ? header.text : groupField;
                    group.rows = group.children;
                    Ext.each(group.children, function(record) {
                        var i, len;
                        for (i = 0, len = data.length; i < len; i++) {
                            if (data[i].__internalId == record.internalId) {
                                record.convertedData = data[i];
                                return;
                            }
                        }
                    });
                });
                body = Ext.create('Ext.XTemplate', bodyTpl).apply(groups);
                Ext.each(groups, function(group) {
                    delete group.groupField;
                    delete group.groupValue;
                    delete group.columnName;
                    delete group.rows;
                    Ext.each(group.children, function(record) {
                        delete record.convertedData;
                    });
                });
            } else {
                body = Ext.create('Ext.XTemplate', this.bodyTpl).apply(columns);
            }
            return body;
        }
    }
});

Ext.define('Ext.grid.plugin.SelectionMemory', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.selectionmemory',
    init: function(grid) {
        if (grid.lockable) {
            return;
        }
        var me = this;
        this.grid = grid;
        this.headerCt = this.grid.normalGrid ? this.grid.normalGrid.headerCt : this.grid.headerCt;
        this.store = grid.store;
        this.selModel = this.grid.getSelectionModel();
        this.hasPaging = this.grid.down("pagingtoolbar") || this.grid.store.buffered;
        if (this.selModel instanceof Ext.selection.CellModel) {
            this.selModel.onViewRefresh = Ext.emptyFn;
            this.grid.getView().on("beforerefresh", function() {
                delete this.selModel.position;
            }, this);
        }
        this.grid.getSelectionMemory = function() {
            return me;
        };
        this.selectedIds = {};
        this.selModel.on("select", this.onMemorySelect, this);
        this.selModel.on("deselect", this.onMemoryDeselect, this);
        this.grid.store.on("remove", this.onStoreRemove, this);
        this.grid.store.on("load", this.checkPhantoms, this);
        this.grid.getView().on("refresh", this.memoryReConfigure, this, {
            single: true
        });
        this.store.on("add", this.restoreRecordSelection, this);
        this.grid.getView()._onMaskBeforeShow = this.grid.getView().onMaskBeforeShow;
        this.grid.getView().onMaskBeforeShow = Ext.Function.createInterceptor(this.grid.getView().onMaskBeforeShow, this.onMaskBeforeShowBefore, this);
        this.grid.getView().onMaskBeforeShow = Ext.Function.createSequence(this.grid.getView().onMaskBeforeShow, this.onMaskBeforeShowAfter, this);
        this.selModel._onSelectChange = this.selModel.onSelectChange;
        this.selModel.onSelectChange = Ext.Function.createSequence(this.selModel.onSelectChange, this.onSelectChange, this);
    },
    destroy: function() {
        if (this.grid && !this.grid.lockable) {
            this.selModel.un("select", this.onMemorySelect, this);
            this.selModel.un("deselect", this.onMemoryDeselect, this);
            this.grid.store.un("remove", this.onStoreRemove, this);
            this.grid.getView().un("refresh", this.memoryReConfigure, this, {
                single: true
            });
            this.grid.getView().onMaskBeforeShow = this.grid.getView()._onMaskBeforeShow;
            this.selModel.onSelectChange = this.selModel._onSelectChange;
        }
    },
    onMaskBeforeShowBefore: function() {
        this.surpressDeselection = true;
    },
    onMaskBeforeShowAfter: function() {
        this.surpressDeselection = false;
    },
    onSelectChange: function(record, isSelected, suppressEvent, commitFn) {
        if (suppressEvent) {
            if (isSelected) {
                this.onMemorySelect(this.selModel, record, this.store.indexOf(record), null);
            } else {
                this.onMemoryDeselect(this.selModel, record, this.store.indexOf(record));
            }
        }
    },
    clearMemory: function() {
        delete this.selModel.selectedData;
        this.selectedIds = {};
    },
    memoryReConfigure: function() {
        this.store.on("clear", this.onMemoryClear, this);
        this.store.on("datachanged", function() {
            this.memoryRestoreState();
        }, this, {
            delay: 100
        });
    },
    restoreRecordSelection: function(store, records, index) {
        this.memoryRestoreState(records);
    },
    onMemorySelect: function(sm, rec, idx, column) {
        if (this.selModel.selectionMode == "SINGLE") {
            this.clearMemory();
        }
        if (!Ext.isFunction(rec.getId)) {
            return;
        }
        var id = rec.getId(),
            absIndex = this.getAbsoluteIndex(idx);
        if (id || id === 0) {
            this.onMemorySelectId(sm, absIndex, id, column);
        }
    },
    onMemorySelectId: function(sm, index, id, column) {
        if (!id && id !== 0) {
            return;
        }
        var obj = {
                id: id,
                index: index
            },
            col = Ext.isNumber(column) && this.headerCt.getHeaderAtIndex(column);
        if (col && col.dataIndex) {
            obj.dataIndex = col.dataIndex;
        }
        this.selectedIds[id] = obj;
    },
    getAbsoluteIndex: function(pageIndex) {
        return ((this.store.currentPage - 1) * this.store.pageSize) + pageIndex;
    },
    onMemoryDeselect: function(sm, rec, idx) {
        if (this.surpressDeselection) {
            return;
        }
        delete this.selectedIds[rec.getId()];
    },
    onStoreRemove: function(store, rec, idx) {
        this.onMemoryDeselect(null, rec, idx);
    },
    memoryRestoreState: function(records) {
        if (this.store !== null && !this.store.buffered && !this.grid.view.bufferedRenderer) {
            var i = 0,
                ind, sel = [],
                len, all = true,
                cm = this.headerCt;
            if (!records) {
                records = this.store.getRange();
            }
            if (!Ext.isArray(records)) {
                records = [records];
            }
            if (this.selModel.isLocked()) {
                this.wasLocked = true;
                this.selModel.setLocked(false);
            }
            if (this.selModel instanceof Ext.selection.RowModel) {
                for (ind = 0, len = records.length; ind < len; ind++) {
                    var rec = records[ind],
                        id = rec.getId();
                    if ((id || id === 0) && !Ext.isEmpty(this.selectedIds[id])) {
                        sel.push(rec);
                    } else {
                        all = false;
                    }
                    ++i;
                }
                if (sel.length > 0) {
                    this.surpressDeselection = true;
                    this.selModel.select(sel, false, !this.grid.selectionMemoryEvents);
                    this.surpressDeselection = false;
                }
            } else {
                for (ind = 0, len = records.length; ind < len; ind++) {
                    var rec = records[ind],
                        id = rec.getId();
                    if ((id || id === 0) && !Ext.isEmpty(this.selectedIds[id])) {
                        if (this.selectedIds[id].dataIndex) {
                            var colIndex = cm.getHeaderIndex(cm.down('gridcolumn[dataIndex=' + this.selectedIds[id].dataIndex + ']'))
                            this.selModel.setCurrentPosition({
                                row: i,
                                column: colIndex
                            });
                        }
                        return false;
                    }
                    ++i;
                }
            }
            if (this.selModel instanceof Ext.selection.CheckboxModel) {
                if (all) {
                    this.selModel.toggleUiHeader(true);
                } else {
                    this.selModel.toggleUiHeader(false);
                }
            }
            if (this.wasLocked) {
                this.selModel.setLocked(true);
            }
        }
    },
    onMemoryClear: function() {
        this.selectedIds = {};
    },
    checkPhantoms: function() {
        if (!this.hasPaging) {
            var removeIds = [];
            for (var id in this.selectedIds) {
                if (this.selectedIds.hasOwnProperty(id) && !this.grid.store.getById(id)) {
                    removeIds.push(id);
                }
            }
            if (removeIds.length) {
                for (var i = 0; i < removeIds.length; i++) {
                    delete this.selectedIds[removeIds[i]];
                }
            }
        }
    }
});

Ext.define('Ext.grid.plugin.SelectionSubmit', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.selectionsubmit',
    init: function(grid) {
        if (grid.lockable) {
            return;
        }
        this.grid = grid;
        this.isTree = this.grid.isTree;
        this.headerCt = this.grid.normalGrid ? this.grid.normalGrid.headerCt : this.grid.headerCt;
        this.store = grid.store;
        this.selModel = this.grid.getSelectionModel();
        var me = this;
        this.grid.getSelectionSubmit = function() {
            return me;
        };
        this.initSelection();
    },
    initSelection: function() {
        var sm = this.grid.getSelectionModel();
        this.hField = this.getSelectionModelField();
        var isCellModel = sm instanceof Ext.selection.CellModel;
        if (isCellModel) {
            sm.on("deselect", this.updateSelection, this, {
                buffer: 1
            });
            sm.on("select", this.updateSelection, this, {
                buffer: 1
            });
        } else {
            sm.on("selectionchange", this.updateSelection, this, {
                buffer: 10
            });
        }
        this.store.on("add", this.updateSelection, this, {
            buffer: 1
        });
        this.store.on("remove", this.updateSelection, this, {
            buffer: 1
        });
        this.grid.getView().on("viewready", this.renderHiddenField, this);
        this.grid.store.on("clear", this.clearField, this);
    },
    renderHiddenField: function() {
        if (this.grid.selectionSubmit && this.grid.getSelectionModel().proxyId) {
            this.getSelectionModelField().render(this.grid.el.parent() || this.grid.el);
        }
        this.initSelectionData();
    },
    clearField: function() {
        this.getSelectionModelField().setValue("");
    },
    getSelectionModelField: function() {
        if (!this.hField) {
            var id = this.selModel.hiddenName || this.selModel.proxyId || this.selModel.id;
            this.hField = new Ext.form.Hidden({
                name: id
            });
        }
        return this.hField;
    },
    destroy: function() {
        if (this.hField) {
            this.hField.destroy();
            if (!this.isTree) {
                this.store.un("load", this.doSelection, this, {
                    single: true,
                    delay: 100
                });
            }
        }
        if (this.grid && !this.grid.lockable && this.grid.selModel) {
            var sm = this.grid.getSelectionModel();
            if (sm instanceof Ext.selection.CellModel) {
                sm.un("deselect", this.updateSelection, this, {
                    buffer: 1
                });
                sm.un("select", this.updateSelection, this, {
                    buffer: 1
                });
            } else {
                sm.un("selectionchange", this.updateSelection, this, {
                    buffer: 10
                });
            }
            this.store.un("add", this.updateSelection, this);
            this.store.un("remove", this.updateSelection, this);
            this.grid.getView().un("viewready", this.renderHiddenField, this);
            this.grid.store.un("clear", this.clearField, this);
        }
    },
    doSelection: function() {
        var grid = this.grid,
            cm = this.headerCt,
            store = this.grid.store,
            selModel = grid.getSelectionModel(),
            data = selModel.selectedData,
            notFoundRecords = [],
            records = [];
        if (!Ext.isEmpty(data)) {
            selModel.suspendChanges();
            if (selModel instanceof Ext.selection.CellModel) {
                if (!Ext.isEmpty(data.recordID) && !Ext.isEmpty(data.name)) {
                    var rowIndex = grid.store.indexOfId(data.recordID),
                        colIndex = cm.getHeaderIndex(cm.down('gridcolumn[dataIndex=' + data.name + ']'));
                    if (rowIndex < 0 && Ext.isNumeric(data.recordID)) {
                        rowIndex = grid.store.indexOfId(parseInt(data.recordID, 10));
                    }
                    if (rowIndex > -1 && colIndex > -1) {
                        selModel.setCurrentPosition({
                            row: rowIndex,
                            column: colIndex
                        });
                    }
                } else if (!Ext.isEmpty(data.rowIndex) && !Ext.isEmpty(data.colIndex)) {
                    selModel.setCurrentPosition({
                        row: data.rowIndex,
                        column: data.colIndex
                    });
                }
            } else if (selModel instanceof Ext.selection.RowModel) {
                var sMemory = grid.getSelectionMemory && grid.getSelectionMemory(),
                    record;
                for (var i = 0; i < data.length; i++) {
                    if (!Ext.isEmpty(data[i].recordID)) {
                        record = store.getById(data[i].recordID);
                        if (!record && Ext.isNumeric(data[i].recordID)) {
                            record = store.getById(parseInt(data[i].recordID, 10));
                        }
                        if (sMemory) {
                            var idx = data[i].rowIndex || -1;
                            if (!Ext.isEmpty(record)) {
                                idx = this.store.indexOfId(record.getId());
                                idx = sMemory.getAbsoluteIndex(idx);
                                if (idx < 0) {
                                    record = null;
                                }
                            }
                            sMemory.onMemorySelectId(null, idx, data[i].recordID);
                        }
                    } else if (!Ext.isEmpty(data[i].rowIndex)) {
                        record = this.isTree ? store.getRootNode().getChildAt(data[i].rowIndex) : store.getAt(data[i].rowIndex);
                        if (sMemory && !Ext.isEmpty(record)) {
                            sMemory.onMemorySelectId(null, data[i].rowIndex, record.getId());
                        }
                    }
                    if (!Ext.isEmpty(record)) {
                        records.push(record);
                    } else if (this.isTree) {
                        notFoundRecords.push(data[i]);
                    }
                }
                if (records.length == 0) {
                    selModel.deselectAll();
                } else {
                    selModel.select(records, false, !this.grid.selectionMemoryEvents);
                }
            }
            this.updateSelection();
            selModel.resumeChanges();
            delete selModel.selectedData;
            if (this.isTree && notFoundRecords.length > 0) {
                selModel.selectedData = notFoundRecords;
                this.store.on("load", this.doSelection, this, {
                    single: true,
                    delay: 10
                });
            }
            selModel.maybeFireSelectionChange(records.length > 0);
        }
    },
    updateSelection: function() {
        var grid = this.grid,
            cm = this.headerCt,
            store = this.grid.store,
            selModel = grid.getSelectionModel(),
            sMemory = grid.getSelectionMemory && grid.getSelectionMemory(),
            rowIndex;
        if (this.grid.selectionSubmit === false) {
            return;
        }
        if (selModel instanceof Ext.selection.RowModel) {
            var records = [];
            if (sMemory && sMemory.selectedIds && !Ext.isEmptyObj(sMemory.selectedIds)) {
                for (var id in sMemory.selectedIds) {
                    if (sMemory.selectedIds.hasOwnProperty(id)) {
                        records.push({
                            RecordID: sMemory.selectedIds[id].id,
                            RowIndex: sMemory.selectedIds[id].index
                        });
                    }
                }
            } else {
                var selectedRecords = selModel.getSelection();
                for (var i = 0; i < selectedRecords.length; i++) {
                    if (this.isTree) {
                        records.push({
                            RecordID: selectedRecords[i].getId()
                        });
                    } else {
                        rowIndex = store.indexOf(selectedRecords[i]);
                        records.push({
                            RecordID: selectedRecords[i].getId(),
                            RowIndex: rowIndex
                        });
                    }
                }
            }
            this.hField.setValue(Ext.encode(records));
        } else if (selModel instanceof Ext.selection.CellModel) {
            var pos = selModel.getCurrentPosition(),
                r = pos && this.store.getAt(pos.row);
            if (!pos || !r) {
                this.hField.setValue("");
                return;
            }
            var name = cm.getHeaderAtIndex(pos.column).dataIndex,
                value = r.get(name),
                id = r.getId() || "";
            this.hField.setValue(Ext.encode({
                RecordID: id,
                Name: name,
                SubmittedValue: value,
                RowIndex: pos.row,
                ColIndex: pos.column
            }));
        }
    },
    initSelectionData: function() {
        if (this.grid.view.viewReady && this.store) {
            if (this.store.getCount() > 0 || this.isTree) {
                Ext.defer(this.doSelection, 100, this);
            } else {
                this.store.on("load", this.doSelection, this, {
                    single: true,
                    delay: 100
                });
            }
        }
    }
});


Ext.grid.ColumnComponentLayout.override({
    getContentHeight: function(ownerContext) {
        return this.owner.isGroupHeader || this.owner.isComponentHeader ? ownerContext.getProp('contentHeight') : Ext.grid.ColumnComponentLayout.superclass.getContentHeight.apply(this, arguments);
    },
    calculateOwnerHeightFromContentHeight: function(ownerContext, contentHeight) {
        var result = Ext.grid.ColumnComponentLayout.superclass.calculateOwnerHeightFromContentHeight.apply(this, arguments);
        if (this.owner.isGroupHeader || this.owner.isComponentHeader) {
            result += (this.owner.titleEl || this.owner.el).dom.offsetHeight;
        }
        return result;
    }
});
Ext.grid.column.Column.override({
    hideTitleEl: false,
    initComponent: function() {
        var me = this;
        if (me.headerItems) {
            me.isComponentHeader = true;
            me.cls = (me.cls || '') + ' ' + Ext.baseCSSPrefix + 'group-header';
            me.items = [{
                xtype: "container",
                flex: 1,
                cls: Ext.baseCSSPrefix + 'grid-header-widgets',
                border: false,
                layout: 'anchor',
                margins: {
                    top: 1,
                    left: 1,
                    right: 1,
                    bottom: 0
                },
                defaults: {
                    anchor: "100%"
                },
                items: me.headerItems
            }];
            delete me.headerItems;
            if (me.hidden) {
                me.on("show", function() {
                    Ext.suspendLayouts();
                    this.items.each(function(item) {
                        item.show();
                    });
                    Ext.resumeLayouts();
                }, this, {
                    single: true
                });
            }
        }
        if (me.isCellCommand && me.commands && !me.isCommandColumn) {
            me.userRenderer = me.renderer || this.defaultRenderer;
            me.renderer = Ext.Function.bind(me.cellCommandRenderer, me);
            me.addEvents("command");
        }
        if (me.isComponentHeader) {
            me.layout = Ext.apply({
                type: 'hbox'
            });
            me.isContainer = true;
        }
        this.callParent();
        if (me.isComponentHeader) {
            me.layout = Ext.apply({
                type: 'hbox'
            });
            me.isContainer = true;
        }
        if (me.wrap) {
            if (!Ext.isString(me.tdCls)) {
                me.tdCls = "";
            }
            me.tdCls += " x-grid-cell-wrap";
        }
    },
    afterHide: function() {
        this.callParent(arguments);
        Ext.select(".x-grid-cell-" + this.id).addCls("x-hide-command");
    },
    afterShow: function() {
        this.callParent(arguments);
        Ext.select(".x-grid-cell-" + this.id).removeCls("x-hide-command");
    },
    afterRender: function() {
        this.callParent(arguments);
        if (this.isComponentHeader && this.initialConfig.flex && this.grid) {
            this.grid.on("afterlayout", function() {
                if (this.rendered) {
                    Ext.AbstractComponent.updateLayout(this);
                }
            }, this, {
                delay: 10
            });
        }
        if (this.hideTitleEl) {
            this.titleEl.setDisplayed(false);
        }
    },
    initRenderData: function() {
        var me = this;
        if (!me.grid) {
            me.grid = me.up('tablepanel');
        }
        return this.callParent(arguments);
    },
    onElClick: Ext.Function.createInterceptor(Ext.grid.column.Column.prototype.onElClick, function(e, t) {
        if (e.getTarget('.x-grid-header-widgets', this.getOwnerHeaderCt())) {
            return false;
        }
    }),
    onElDblClick: Ext.Function.createInterceptor(Ext.grid.column.Column.prototype.onElDblClick, function(e, t) {
        if (e.getTarget('.x-grid-header-widgets', this.getOwnerHeaderCt())) {
            return false;
        }
    }),
    cellCommandTemplate: '<div class="cell-imagecommands <tpl if="rightValue === true">cell-imagecommand-right-value</tpl>">' + '<tpl if="rightAlign === true && rightValue === false"><div class="cell-imagecommand-value">{value}</div></tpl>' + '<tpl for="commands">' + '<div cmd="{command}" class="cell-imagecommand <tpl if="parent.rightAlign === false">left-cell-imagecommand</tpl> {cls} {iconCls} {hideCls}" ' + 'style="{style}" data-qtip="{qtext}" data-qtitle="{qtitle}">' + '<tpl if="text"><span data-qtip="{qtext}" data-qtitle="{qtitle}">{text}</span></tpl>' + '</div>' + '</tpl>' + '<tpl if="rightAlign === false || rightValue === true"><div class="cell-imagecommand-value">{value}</div></tpl>' + '</div>',
    getCellCommandTemplate: function() {
        if (Ext.isEmpty(this.cellTemplate)) {
            this.cellTemplate = new Ext.XTemplate(this.cellCommandTemplate);
        }
        return this.cellTemplate;
    },
    processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
        var me = this,
            match = e.getTarget(".cell-imagecommand", 5);
        if (match) {
            if (type == 'click') {
                me.onCellCommandClick(view, e, match, cell, recordIndex, cellIndex);
            } else if (type == "mousedown") {
                return false;
            }
        }
        if (type == "mousedown" && this.stopSelectionSelectors) {
            var i = 0,
                s = this.stopSelectionSelectors;
            for (i; i < s.length; i++) {
                if (e.getTarget(s[i], cell)) {
                    return false;
                }
            }
        }
        return me.fireEvent.apply(me, arguments);
    },
    cellCommandRenderer: function(value, meta, record, row, col, store, view) {
        var me = this;
        if (me.commands && me.commands.length > 0 && me.isCellCommand) {
            var rightAlign = me.rightCommandAlign === false ? false : true,
                preparedCommands = [],
                commands = me.commands,
                i, cmd, command, userRendererValue;
            for (i = 0; i < commands.length; i++) {
                cmd = commands[i];
                if (cmd.iconCls && cmd.iconCls.charAt(0) === '#') {
                    cmd.iconCls = X.net.RM.getIcon(cmd.iconCls.substring(1));
                }
            }
            if (me.prepareCommands) {
                commands = Ext.net.clone(me.commands);
                me.prepareCommands(me.grid, commands, record, row, col, value);
            }
            for (i = rightAlign ? (commands.length - 1) : 0; rightAlign ? (i >= 0) : (i < commands.length); rightAlign ? i-- : i++) {
                cmd = commands[i];
                cmd.tooltip = cmd.tooltip || {};
                if (cmd.iconCls && cmd.iconCls.charAt(0) === '#') {
                    cmd.iconCls = X.net.RM.getIcon(cmd.iconCls.substring(1));
                }
                command = {
                    command: cmd.command,
                    cls: cmd.cls,
                    iconCls: cmd.iconCls,
                    hidden: cmd.hidden,
                    disabled: cmd.disabled,
                    text: cmd.text,
                    style: cmd.style,
                    qtext: cmd.tooltip.text,
                    qtitle: cmd.tooltip.title,
                    hideMode: cmd.hideMode
                };
                if (me.prepareCommand) {
                    me.prepareCommand(me.grid, command, record, row, col, value);
                }
                if (command.disabled) {
                    command.cls = (command.cls || "") + " x-imagecommand-disabled";
                }
                if (command.hidden) {
                    command.hideCls = "x-hide-" + (command.hideMode || "display");
                }
                preparedCommands.push(command);
            }
            userRendererValue = value;
            if (typeof me.userRenderer === "string") {
                me.userRenderer = Ext.util.Format[me.userRenderer];
            }
            if (typeof me.userRenderer === "function") {
                userRendererValue = me.userRenderer.call(me.scope || me, value, meta, record, row, col, store, view);
            }
            meta.tdCls = meta.tdCls || "";
            meta.tdCls += " cell-imagecommand-cell";
            if (me.isHidden()) {
                meta.tdCls += " x-hide-command";
            }
            return me.getCellCommandTemplate().apply({
                commands: preparedCommands,
                value: userRendererValue,
                rightAlign: rightAlign,
                rightValue: me.align == "right"
            });
        } else {
            meta.tdCls = meta.tdCls || "";
            meta.tdCls += " cell-no-imagecommand";
        }
        if (typeof me.userRenderer === "string") {
            me.userRenderer = Ext.util.Format[me.userRenderer];
        }
        if (typeof me.userRenderer === "function") {
            value = me.userRenderer.call(me.scope || me.ownerCt, value, meta, record, row, col, store, view);
        }
        return value;
    },
    onCellCommandClick: function(view, e, target, cell, recordIndex, cellIndex) {
        var cmd = Ext.fly(target).getAttributeNS("", "cmd"),
            owner = this.grid,
            store = owner.getStore(),
            record = store.getAt ? store.getAt(recordIndex) : view.getRecord(view.getNode(recordIndex));
        if (Ext.isEmpty(cmd, false) || Ext.fly(target).hasCls("x-imagecommand-disabled")) {
            return;
        }
        this.fireEvent("command", this, cmd, record, recordIndex, cellIndex);
    },
    beforeDestroy: function() {
        if (this.editors) {
            Ext.destroy(this.editors);
        }
        this.callParent(arguments);
    },
    onDownKey: function(e) {
        if (!e.getTarget(".x-grid-header-widgets")) {
            this.callParent(arguments);
        }
    },
    onEnterKey: function(e) {
        if (!e.getTarget(".x-grid-header-widgets")) {
            this.callParent(arguments);
        }
    }
});

Ext.grid.RowNumberer.override({
    initRenderData: function() {
        var me = this;
        me.grid = me.up('tablepanel');
        me.grid.store.on("bulkremove", this.updateRecordsIndexes, me);
        return me.callParent(arguments);
    },
    updateRecordsIndexes: function() {
        var store = this.grid.store,
            i, records = store.getAllRange ? store.getAllRange() : store.getRange(),
            len;
        for (i = 0, len = records.length; i < len; i++) {
            records[i].index = i;
        }
        if (store.snapshot) {
            for (i = 0, len = store.snapshot.length; i < len; i++) {
                store.snapshot.items[i].index = i;
            }
        }
        store.fireEvent('refresh', store);
    },
    renderer: function(value, metaData, record, rowIdx, colIdx, store) {
        var rowspan = this.rowspan;
        if (rowspan) {
            metaData.tdAttr = 'rowspan="' + rowspan + '"';
        }
        metaData.tdCls = Ext.baseCSSPrefix + 'grid-cell-special';
        if (store.isPagingStore && store.proxy instanceof Ext.data.proxy.Memory) {
            return (store.allData || store.data).indexOf(record) + 1;
        }
        return store.indexOfTotal ? (store.indexOfTotal(record) + 1) : (rowIdx + 1);
    }
});

Ext.define('Ext.grid.column.ImageCommand', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.imagecommandcolumn',
    commandWidth: 18,
    dataIndex: "",
    menuDisabled: true,
    sortable: false,
    hideable: false,
    isColumn: true,
    isCommandColumn: true,
    adjustmentWidth: 4,
    constructor: function(config) {
        var me = this;
        me.callParent(arguments);
        me.addEvents("command", "groupcommand");
        me.commands = me.commands || [];
        if (me.autoWidth) {
            me.width = me.minWidth = me.commandWidth * me.commands.length + me.adjustmentWidth;
            me.fixed = true;
        }
        me.renderer = Ext.Function.bind(me.renderer, me);
    },
    initRenderData: function() {
        var me = this;
        me.grid = me.up('tablepanel');
        me.grid.addCls("x-grid-group-imagecommand");
        var groupFeature = me.getGroupingFeature(me.grid);
        if (me.groupCommands && groupFeature) {
            me.grid.view.on('groupclick', me.onGroupClick, me);
            me.grid.view.on('containerclick', me.onClick, me);
            groupFeature.groupHeaderTpl = '<div class="group-row-imagecommand-cell">' + groupFeature.groupHeaderTpl + '</div>' + this.groupCommandTemplate;
            groupFeature.commandColumn = me;
            groupFeature.setupRowData = Ext.Function.createSequence(groupFeature.setupRowData, this.getGroupData, this);
        }
        return me.callParent(arguments);
    },
    afterHide: function() {
        this.callParent(arguments);
        Ext.select(".x-grid-cell-" + this.id).addCls("x-hide-command");
    },
    afterShow: function() {
        this.callParent(arguments);
        Ext.select(".x-grid-cell-" + this.id).removeCls("x-hide-command");
    },
    getGroupData: function(record, idx, rowValues) {
        var preparedCommands = [],
            i, cmd, command, groupCommands = this.groupCommands;
        if (!rowValues.isFirstRow) {
            return;
        }
        for (i = 0; i < groupCommands.length; i++) {
            cmd = groupCommands[i];
            if (cmd.iconCls && cmd.iconCls.charAt(0) === '#') {
                cmd.iconCls = X.net.RM.getIcon(cmd.iconCls.substring(1));
            }
        }
        var groupId = record.get(this.getGroupingFeature(this.grid).refreshData.groupField),
            records = groupId ? this.grid.store.getGroups(groupId).children : null;
        if (this.prepareGroupCommands) {
            groupCommands = Ext.net.clone(this.groupCommands);
            this.prepareGroupCommands(this.grid, groupCommands, groupId, records);
        }
        for (i = 0; i < groupCommands.length; i++) {
            cmd = groupCommands[i];
            cmd.tooltip = cmd.tooltip || {};
            if (cmd.iconCls && cmd.iconCls.charAt(0) === '#') {
                cmd.iconCls = X.net.RM.getIcon(cmd.iconCls.substring(1));
            }
            command = {
                command: cmd.command,
                cls: cmd.cls,
                iconCls: cmd.iconCls,
                hidden: cmd.hidden,
                disabled: cmd.disabled,
                text: cmd.text,
                style: cmd.style,
                qtext: cmd.tooltip.text,
                qtitle: cmd.tooltip.title,
                hideMode: cmd.hideMode,
                rightAlign: cmd.rightAlign || false
            };
            if (this.prepareGroupCommand) {
                this.prepareGroupCommand(this.grid, command, groupId, records);
            }
            if (command.iconCls && command.iconCls.charAt(0) === '#') {
                command.iconCls = X.net.RM.getIcon(command.iconCls.substring(1));
            }
            if (command.disabled) {
                command.cls = (command.cls || "") + " x-imagecommand-disabled";
            }
            if (command.hidden) {
                var hideMode = command.hideMode || "display";
                command.hideCls = "x-hide-" + hideMode;
            }
            if (command.rightAlign) {
                command.align = "right-group-imagecommand";
            } else {
                command.align = "";
            }
            preparedCommands.push(command);
        }
        rowValues.groupInfo.commands = preparedCommands;
    },
    getGroupingFeature: function(grid) {
        return grid.groupingFeature;
    },
    processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
        var me = this,
            match = e.getTarget(".row-imagecommand", 3);
        if (match) {
            if (type == 'click') {
                this.onClick(view, e, recordIndex, cellIndex);
            } else if (type == 'mousedown') {
                return false;
            }
            if ((type == 'click' || type == 'mousedown') && me.stopSelection !== false) {
                return false;
            }
        }
        return me.callParent(arguments);
    },
    onGroupClick: function(view, rowElement, groupName, e) {
        var t = e.getTarget(".group-row-imagecommand"),
            cmd;
        if (t) {
            var groupField = this.grid.store.groupField;
            cmd = Ext.fly(t).getAttributeNS("", "cmd");
            if (Ext.isEmpty(cmd, false) || Ext.fly(t).hasCls("x-imagecommand-disabled")) {
                return;
            }
            this.fireEvent("groupcommand", this, cmd, this.grid.store.getGroups(groupName));
        }
        return !t;
    },
    onClick: function(view, e, recordIndex, cellIndex) {
        var view = this.grid.getView(),
            cmd, record, recordId, t = e.getTarget(".row-imagecommand");
        if (t) {
            cmd = Ext.fly(t).getAttributeNS("", "cmd");
            if (Ext.isEmpty(cmd, false) || Ext.fly(t).hasCls("x-imagecommand-disabled")) {
                return;
            }
            var row = e.getTarget(".x-grid-row");
            if (row === false) {
                return;
            }
            if (this !== this.grid.headerCt.getHeaderAtIndex(cellIndex)) {
                return;
            }
            recordId = Ext.fly(t).getAttributeNS("", "recordId");
            if (recordId && this.grid.store.getAt) {
                record = this.grid.store.getByInternalId(recordId);
            } else {
                record = this.grid.store.getAt ? this.grid.store.getAt(recordIndex) : view.getRecord(view.getNode(recordIndex));
            }
            this.fireEvent("command", this, cmd, record, recordIndex, cellIndex);
        }
        t = e.getTarget(".group-row-imagecommand");
        if (t) {
            var groupField = this.grid.store.groupField,
                groupId = Ext.fly(t).up('.x-grid-group-hd').dom.nextSibling.id.substr((view.id + '-gp-').length);
            cmd = Ext.fly(t).getAttributeNS("", "cmd");
            if (Ext.isEmpty(cmd, false) || Ext.fly(t).hasCls("x-imagecommand-disabled")) {
                return;
            }
            this.fireEvent("groupcommand", this, cmd, this.grid.store.getGroups(groupId));
        }
    },
    renderer: function(value, meta, record, row, col, store) {
        meta.tdCls = meta.tdCls || "";
        meta.tdCls += " row-imagecommand-cell";
        if (this.isHidden()) {
            meta.tdCls += " x-hide-command";
        }
        if (this.commands) {
            var preparedCommands = [],
                i, cmd, command, commands = this.commands;
            for (i = 0; i < commands.length; i++) {
                cmd = commands[i];
                if (cmd.iconCls && cmd.iconCls.charAt(0) === '#') {
                    cmd.iconCls = X.net.RM.getIcon(cmd.iconCls.substring(1));
                }
            }
            if (this.prepareCommands) {
                commands = Ext.net.clone(this.commands);
                this.prepareCommands(this.grid, commands, record, row);
            }
            for (i = 0; i < commands.length; i++) {
                cmd = commands[i];
                cmd.tooltip = cmd.tooltip || {};
                if (cmd.iconCls && cmd.iconCls.charAt(0) === '#') {
                    cmd.iconCls = X.net.RM.getIcon(cmd.iconCls.substring(1));
                }
                command = {
                    command: cmd.command,
                    recordId: record.internalId,
                    cls: cmd.cls,
                    iconCls: cmd.iconCls,
                    hidden: cmd.hidden,
                    disabled: cmd.disabled,
                    text: cmd.text,
                    style: cmd.style,
                    qtext: cmd.tooltip.text,
                    qtitle: cmd.tooltip.title,
                    hideMode: cmd.hideMode
                };
                if (this.prepareCommand) {
                    this.prepareCommand(this.grid, command, record, row);
                }
                if (command.iconCls && command.iconCls.charAt(0) === '#') {
                    command.iconCls = X.net.RM.getIcon(command.iconCls.substring(1));
                }
                if (command.disabled) {
                    command.cls = (command.cls || "") + " x-imagecommand-disabled";
                }
                if (command.hidden) {
                    var hideMode = command.hideMode || "display";
                    command.hideCls = "x-hide-" + hideMode;
                }
                if (Ext.isIE6 && Ext.isEmpty(cmd.text, false)) {
                    command.noTextCls = "no-row-imagecommand-text";
                }
                preparedCommands.push(command);
            }
            return this.getRowTemplate().apply({
                commands: preparedCommands
            });
        }
        return "";
    },
    commandTemplate: '<div class="row-imagecommands">' + '<tpl for="commands">' + '<div recordId="{recordId}" cmd="{command}" class="row-imagecommand {cls} {noTextCls} {iconCls} {hideCls}" ' + 'style="{style}" data-qtip="{qtext}" data-qtitle="{qtitle}">' + '<tpl if="text"><span data-qtip="{qtext}" data-qtitle="{qtitle}">{text}</span></tpl>' + '</div>' + '</tpl>' + '</div>',
    groupCommandTemplate: '<tpl for="commands">' + '<div cmd="{command}" class="group-row-imagecommand {cls} {iconCls} {hideCls} {align}" ' + 'style="{style}" data-qtip="{qtext}" data-qtitle="{qtitle}"><tpl if="text"><span data-qtip="{qtext}" data-qtitle="{qtitle}">{text}</span></tpl></div>' + '</tpl>',
    getRowTemplate: function() {
        if (Ext.isEmpty(this.rowTemplate)) {
            this.rowTemplate = new Ext.XTemplate(this.commandTemplate);
        }
        return this.rowTemplate;
    }
});

Ext.define("Ext.grid.column.CommandColumn", {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.commandcolumn',
    dataIndex: "",
    menuDisabled: true,
    sortable: false,
    autoWidth: false,
    hideable: false,
    isColumn: true,
    isCommandColumn: true,
    showDelay: 250,
    hideDelay: 500,
    overOnly: false,
    constructor: function(config) {
        var me = this;
        me.callParent(arguments);
        me.cache = [];
        me.commands = me.commands || [];
        me.addEvents("command", "groupcommand");
        me.renderer = Ext.Function.bind(me.renderer, me);
    },
    renderer: function(value, meta, record, row, col, store) {
        meta.tdCls = meta.tdCls || "";
        meta.tdCls += " row-cmd-cell";
        if (this.overOnly) {
            return "<div class='row-cmd-placeholder'>" + this.overRenderer(value, meta, record, row, col, store) + "</div>";
        }
        return "";
    },
    overRenderer: function(value, meta, record, row, col, store) {
        if (this.placeholder) {} else {
            return "<div class='x-over-commands-ph'></div>";
        }
    },
    initRenderData: function() {
        var me = this;
        me.grid = me.up('tablepanel');
        me.grid.addCls("x-grid-componentcolumn");
        me.view = me.grid.getView();
        var groupFeature = me.getGroupingFeature(me.grid);
        if (me.commands) {
            if (me.overOnly) {
                me.view.on("beforerefresh", me.moveToolbar, me);
                me.view.on("beforeitemupdate", me.moveToolbar, me);
                me.view.on("beforeitemremove", me.moveToolbar, me);
                me.view.on("itemmouseenter", me.onItemMouseEnter, me);
                me.view.on("itemmouseleave", me.onItemMouseLeave, me);
            } else {
                me.shareMenus(me.commands, "initMenu");
                me.view.on("beforerefresh", me.removeToolbars, me);
                me.view.on("refresh", me.insertToolbars, me, {
                    buffer: 10
                });
                me.view.on("beforeitemupdate", me.removeToolbar, me);
                me.view.on("beforeitemremove", me.removeToolbar, me);
                me.view.on("itemadd", me.itemAdded, me);
                me.view.on("itemupdate", me.itemUpdated, me);
            }
            if (me.view.bufferedRenderer) {
                Ext.Function.interceptBefore(me.view.all, "scroll", me.beforeScroll, me);
                Ext.Function.interceptAfter(me.view.all, "scroll", me.afterScroll, me);
                Ext.Function.interceptBefore(me.view.all, "clear", me.beforeAllClear, me);
                Ext.Function.interceptAfter(me.view, "doAdd", Ext.Function.createBuffered(me.afterViewAdd, 50, me));
            }
        }
        if (me.groupCommands && groupFeature) {
            me.shareMenus(me.groupCommands, "initGroupMenu");
            groupFeature.groupHeaderTpl = '<div class="standard-view-group">' + groupFeature.groupHeaderTpl + '</div>';
            groupFeature.doCollapseExpand = Ext.Function.createInterceptor(groupFeature.doCollapseExpand, this.beforeCollapseExpand, this);
            if (!me.commands || me.overOnly) {
                me.view.on("beforerefresh", me.removeToolbars, this);
            }
            me.view.on("refresh", me.insertGroupToolbars, this, {
                buffer: 10
            });
            me.view.on("groupcollapse", me.insertGroupToolbar, this);
            me.view.on("groupexpand", me.insertGroupToolbar, this);
            me.mon(me.grid, "resize", me.onGridResize, me);
            me.view.on('groupclick', me.groupToolbarClick);
        }
        if (me.grid.isTree || me.grid.ownerLockable && me.grid.ownerLockable.isTree) {
            me._cnrScope = {
                column: me,
                root: false
            };
            me.grid.on("beforeitemcollapse", me.removeNodeToolbars, me._cnrScope);
            me._crScope = {
                column: me,
                root: true
            };
            me.grid.on("beforeitemmove", me.removeNodeToolbars, me._crScope);
        }
        return me.callParent(arguments);
    },
    beforeAllClear: function(removeDom) {
        if (removeDom) {
            this.removeToolbars();
        }
    },
    beforeScroll: function(newRecords, direction, removeCount) {
        var me = this,
            i, removeEnd, nc = me.view.all,
            elements = nc.elements;
        if (direction == -1) {
            for (i = (nc.endIndex - removeCount) + 1; i <= nc.endIndex; i++) {
                me.removeToolbar(me.view, me.view.getRecord(elements[i]));
            }
        } else {
            removeEnd = nc.startIndex + removeCount;
            for (i = nc.startIndex; i < removeEnd; i++) {
                me.removeToolbar(me.view, me.view.getRecord(elements[i]));
            }
        }
    },
    afterScroll: function(newRecords, direction, removeCount) {
        var me = this,
            i, recCount = newRecords.length;
        for (i = 0; i < recCount; i++) {
            me.insertToolbarForRecord(newRecords[i]);
        }
    },
    afterViewAdd: function(records, index) {
        var me = this,
            count = records.length,
            i;
        for (i = 0; i < count; i++) {
            me.insertToolbarForRecord(records[i]);
        }
    },
    beforeCollapseExpand: function(collapsed, groupName, focus) {
        var me = this,
            groupFeature = me.getGroupingFeature(me.grid),
            group = groupFeature.groupCache[groupName];
        if (group.isCollapsed != collapsed) {
            this.removeGroupToolbar(groupName);
        }
    },
    groupToolbarClick: function(view, group, idx, e, options) {
        return !e.getTarget('.x-toolbar', view.el);
    },
    onGridResize: function() {
        for (var i = 0, l = this.cache.length; i < l; i++) {
            if (this.cache[i].groupId) {
                this.cache[i].doLayout();
            }
        }
    },
    processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
        var me = this,
            match = e.getTarget(".row-cmd-cell", view.el);
        if (match && (type == 'click' || type == 'mousedown') && me.stopSelection !== false) {
            return false;
        }
        return me.callParent(arguments);
    },
    onItemMouseLeave: function(view, record, item, index, e) {
        var me = this;
        if (me.showDelayTask) {
            clearTimeout(me.showDelayTask);
            delete me.showDelayTask;
        }
        if (me.hideDelay) {
            if (me.hideDelayTask) {
                clearTimeout(me.hideDelayTask);
            }
            me.hideDelayTask = setTimeout(function() {
                me.hideToolbar(view, record, item, index, e);
            }, me.hideDelay);
        } else {
            me.hideToolbar(view, record, item, index, e);
        }
    },
    moveToolbar: function() {
        this.hideToolbar();
    },
    hideToolbar: function(view, record, item, index, e) {
        delete this.hideDelayTask;
        if (this.showDelayTask) {
            clearTimeout(this.showDelayTask);
            delete this.showDelayTask;
        }
        if (this.overToolbar && this.overToolbar.rendered && this.overToolbar.hidden !== true) {
            if (!item) {
                this.doToolbarHide();
                return;
            }
            var isVisible = false,
                menu;
            this.overToolbar.items.each(function(button) {
                if (button && button.menu && button.menu.isVisible()) {
                    isVisible = true;
                    menu = button.menu;
                    return false;
                }
            });
            if (isVisible) {
                menu.on("hide", function() {
                    this.column.doToolbarHide(this.item);
                }, {
                    column: this,
                    item: item
                }, {
                    single: true
                });
                return;
            }
            this.doToolbarHide(item);
        }
    },
    getRenderTarget: function(node) {
        var td = this.select(node)[0];
        return td ? Ext.get(td).first("div") : null;
    },
    doToolbarHide: function(item) {
        var ce = this.overToolbar.getEl(),
            el = Ext.net.ResourceMgr.getAspForm() || Ext.getBody(),
            div = item ? this.getRenderTarget(item) : null;
        this.restoreLastPlaceholder();
        if (div) {
            div.down('.row-cmd-placeholder').removeCls("x-hide-display");
        }
        this.overToolbar.addCls("x-hide-display");
        this.overToolbar.hidden = true;
        el.dom.appendChild(ce.dom);
    },
    onItemMouseEnter: function(view, record, item, index, e) {
        var me = this;
        if (me.hideDelayTask) {
            clearTimeout(me.hideDelayTask);
            delete me.hideDelayTask;
        }
        if (me.showDelay) {
            if (me.showDelayTask) {
                clearTimeout(me.showDelayTask);
            }
            me.showDelayTask = setTimeout(function() {
                me.showToolbar(view, record, item, index, e);
            }, me.showDelay);
        } else {
            me.showToolbar(view, record, item, index, e);
        }
    },
    restoreLastPlaceholder: function() {
        if (this.lastToolbarDiv) {
            if (this.lastToolbarDiv.dom) {
                try {
                    this.lastToolbarDiv.down('.row-cmd-placeholder').removeCls("x-hide-display");
                } catch (e) {}
            }
            delete this.lastToolbarDiv;
        }
    },
    showToolbar: function(view, record, item, index, e) {
        delete this.showDelayTask;
        if (this.hideDelayTask) {
            clearTimeout(this.hideDelayTask);
            delete this.hideDelayTask;
        }
        if (!this.overToolbar && this.commands) {
            this.overToolbar = Ext.create("Ext.toolbar.Toolbar", {
                ui: "flat",
                items: this.commands,
                enableOverflow: false,
                layout: {
                    pack: this.pack
                }
            });
        }
        if (this.overToolbar) {
            var toolbar = this.overToolbar,
                div = this.getRenderTarget(item);
            this.restoreLastPlaceholder();
            this.lastToolbarDiv = div;
            if (div) {
                div.down('.row-cmd-placeholder').addCls("x-hide-display");
                div.addCls("row-cmd-cell-ct");
            }
            if (toolbar.rendered && div) {
                div.appendChild(toolbar.getEl());
            } else {
                if (div) {
                    toolbar.render(div);
                }
                toolbar.items.each(function(button) {
                    if (button.on) {
                        button.toolbar = toolbar;
                        if (button.standOut) {
                            button.on("mouseout", function() {
                                this.getEl().addCls("x-btn-over");
                            }, button);
                        }
                        if (!Ext.isEmpty(button.command, false)) {
                            button.on("click", function() {
                                var i = 0;
                                if (this.toolbar.grid.store.indexOf) {
                                    i = this.toolbar.grid.store.indexOf(this.toolbar.record);
                                } else if (this.toolbar.record.parentNode) {
                                    i = this.toolbar.record.parentNode.indexOf(this.toolbar.record);
                                }
                                this.toolbar.column.fireEvent("command", toolbar.column, this.command, this.toolbar.record, i);
                            }, button);
                        }
                        if (button.menu && !button.menu.shared) {
                            this.initMenu(button.menu, toolbar);
                        }
                    }
                }, this);
            }
            this.overToolbar.removeCls("x-hide-display");
            this.overToolbar.hidden = false;
            toolbar.record = record;
            toolbar.items.each(function(button) {
                if (button && button.menu && button.menu.isVisible()) {
                    button.menu.hide();
                }
            });
            if ((this.prepareToolbar && this.prepareToolbar(this.grid, toolbar, index, record) === false) || !div) {
                this.hideToolbar();
                return;
            }
            toolbar.grid = this.grid;
            toolbar.column = this;
            toolbar.rowIndex = index;
            toolbar.record = record;
        }
    },
    getGroupingFeature: function(grid) {
        return grid.groupingFeature;
    },
    itemUpdated: function(record, index, node) {
        this.insertToolbarForRecord(record, node);
    },
    itemAdded: function(records, index, nodes) {
        for (var i = 0, len = records.length; i < len; i++) {
            this.insertToolbarForRecord(records[i], nodes && nodes[i], i === (len - 1));
        }
    },
    select: function(row) {
        var classSelector = "x-grid-cell-" + this.id + ".row-cmd-cell",
            el = row ? Ext.fly(row) : this.grid.getEl();
        return el.query("td." + classSelector);
    },
    shareMenus: function(items, initMenu) {
        Ext.each(items, function(item) {
            if (item.menu) {
                if (item.menu.shared) {
                    item.menu.autoDestroy = false;
                    item.destroyMenu = false;
                    item.onMenuShow = Ext.emptyFn;
                    item.showMenu = function() {
                        if (this.rendered && this.menu) {
                            if (this.tooltip) {
                                Ext.tip.QuickTipManager.getQuickTip().cancelShow(me.btnEl);
                            }
                            if (this.menu.isVisible()) {
                                this.menu.hide();
                            }
                            this.menu.showBy(this.el, this.menuAlign);
                            this.menu.ownerCt = this;
                            this.ignoreNextClick = 0;
                            this.addClsWithUI(this.menuActiveCls);
                            this.fireEvent('menushow', this, this.menu);
                        }
                        return this;
                    };
                    item.menu = Ext.ComponentMgr.create(item.menu, "menu");
                    this.sharedMenus = this.sharedMenus || [];
                    this.sharedMenus.push(item.menu);
                    this[initMenu](item.menu, null, true);
                } else {
                    this.shareMenus(item.menu.items || []);
                }
            }
        }, this);
    },
    insertGroupToolbar: function(view, div) {
        var toolbar;
        if (this.groupCommands) {
            if (!div) {
                return;
            }
            var groupId = div.parent().query(".x-grid-group-hd")[0].id.substr((this.view.id + '-hd-').length),
                i = 0,
                cacheLength = this.cache.length;
            for (; i < cacheLength; i++) {
                if (this.cache[i].groupId === groupId) {
                    return;
                }
            }
            toolbar = new Ext.toolbar.Toolbar({
                items: this.groupCommands,
                ui: "flat",
                enableOverflow: false
            });
            this.cache.push(toolbar);
            div.addCls("row-cmd-cell-group-ct");
            toolbar.render(div);
            var records = this.getRecords(groupId);
            if (this.prepareGroupToolbar && this.prepareGroupToolbar(this.grid, toolbar, groupId, records) === false) {
                toolbar.destroy();
                return;
            }
            toolbar.grid = this.grid;
            toolbar.column = this;
            toolbar.groupId = groupId;
            toolbar.items.each(function(button) {
                if (button.on) {
                    button.toolbar = toolbar;
                    button.column = this;
                    if (button.standOut) {
                        button.on("mouseout", function() {
                            this.getEl().addCls("x-btn-over");
                        }, button);
                    }
                    if (!Ext.isEmpty(button.command, false)) {
                        button.on("click", function() {
                            this.toolbar.column.fireEvent("groupcommand", this.toolbar.column, this.command, this.toolbar.grid.store.getGroups(this.toolbar.groupId));
                        }, button);
                    }
                    if (button.menu && !button.menu.shared) {
                        this.initGroupMenu(button.menu, toolbar);
                    }
                }
            }, this);
        }
    },
    insertToolbarForRecord: function(record, node, refreshSize) {
        if (this.commands) {
            var toolbar, view = this.view,
                div, i;
            if (record.isCollapsedPlaceholder) {
                return;
            }
            if (!node) {
                node = this.view.getNode(record, true);
            }
            if (!node) {
                return;
            }
            div = Ext.fly(node).down(this.getCellSelector() + " div");
            if (!div) {
                return;
            }
            toolbar = Ext.create("Ext.toolbar.Toolbar", {
                items: this.commands,
                ui: "flat",
                enableOverflow: false,
                layout: {
                    pack: this.pack
                }
            });
            if (view.store.indexOf) {
                i = view.store.indexOf(record);
            } else if (record.parentNode) {
                i = record.parentNode.indexOf(record);
            }
            this.cache.push(toolbar);
            div.dom.innerHTML = "";
            div.addCls("row-cmd-cell-ct");
            toolbar.render(div);
            toolbar.record = record;
            if (this.prepareToolbar && this.prepareToolbar(this.grid, toolbar, i, record) === false) {
                toolbar.destroy();
                return;
            }
            toolbar.grid = this.grid;
            toolbar.column = this;
            toolbar.rowIndex = i;
            toolbar.record = record;
            toolbar.items.each(function(button) {
                if (button.on) {
                    button.toolbar = toolbar;
                    if (button.standOut) {
                        button.on("mouseout", function() {
                            this.getEl().addCls("x-btn-over");
                        }, button);
                    }
                    if (!Ext.isEmpty(button.command, false)) {
                        button.on("click", function() {
                            var i = 0;
                            if (this.toolbar.grid.store.indexOf) {
                                i = this.toolbar.grid.store.indexOf(this.toolbar.record);
                            } else if (this.toolbar.record.parentNode) {
                                i = this.toolbar.record.parentNode.indexOf(this.toolbar.record);
                            }
                            this.toolbar.column.fireEvent("command", toolbar.column, this.command, this.toolbar.record, i);
                        }, button);
                    }
                    if (button.menu && !button.menu.shared) {
                        this.initMenu(button.menu, toolbar);
                    }
                }
            }, this);
            if (!this.view._bufferedRefreshSize) {
                this.view._bufferedRefreshSize = Ext.Function.createBuffered(this.view.refreshSize, 10, this.view);
            }
            if (refreshSize !== false) {
                this.view._bufferedRefreshSize();
            }
        }
    },
    insertToolbars: function() {
        var records = this.view.getViewRange(),
            i, len = (records && records.length) || 0;
        for (i = 0; i < len; i++) {
            this.insertToolbarForRecord(records[i], null, i === (len - 1));
        }
    },
    initMenu: function(menu, toolbar, shared) {
        menu.items.each(function(item) {
            if (item.on) {
                item.toolbar = toolbar;
                if (shared) {
                    item.on("click", function() {
                        var pm = this.parentMenu;
                        while (pm && !pm.shared) {
                            pm = pm.parentMenu;
                        }
                        if (pm && pm.shared && pm.ownerCt && pm.ownerCt.toolbar) {
                            var toolbar = pm.ownerCt.toolbar,
                                i = 0;
                            if (this.toolbar.grid.store.indexOf) {
                                i = this.toolbar.grid.store.indexOf(this.toolbar.record);
                            } else if (this.toolbar.record.parentNode) {
                                i = this.toolbar.record.parentNode.indexOf(this.toolbar.record);
                            }
                            toolbar.column.fireEvent("command", toolbar.column, this.command, toolbar.record, i);
                        }
                    }, item);
                    item.getRecord = function() {
                        var pm = this.parentMenu;
                        while (pm && !pm.shared) {
                            pm = pm.parentMenu;
                        }
                        if (pm && pm.shared && pm.ownerCt && pm.ownerCt.toolbar) {
                            var toolbar = pm.ownerCt.toolbar;
                            return toolbar.record;
                        }
                    };
                } else {
                    if (!Ext.isEmpty(item.command, false)) {
                        item.on("click", function() {
                            this.toolbar.column.fireEvent("command", this.toolbar.column, this.command, this.toolbar.record, this.toolbar.rowIndex);
                        }, item);
                        item.getRecord = function() {
                            return this.toolbar.record;
                        };
                    }
                }
                if (item.menu) {
                    this.initMenu(item.menu, toolbar, shared);
                }
            }
        }, this);
    },
    removeNodeToolbars: function(node) {
        node.cascadeBy(function(n) {
            if (n != node || this.root) {
                this.column.removeToolbar(this.column.view, n);
            }
        }, this);
    },
    removeToolbar: function(view, record, rowIndex) {
        for (var i = 0, l = this.cache.length; i < l; i++) {
            if (this.cache[i].record && (this.cache[i].record.id == record.id)) {
                try {
                    this.cache[i].destroy();
                    Ext.Array.remove(this.cache, this.cache[i]);
                } catch (ex) {}
                break;
            }
        }
    },
    removeGroupToolbar: function(groupId) {
        for (var i = 0, l = this.cache.length; i < l; i++) {
            if (this.cache[i].groupId == groupId) {
                try {
                    this.cache[i].destroy();
                    Ext.Array.remove(this.cache, this.cache[i]);
                } catch (ex) {}
                break;
            }
        }
    },
    removeToolbars: function() {
        for (var i = 0, l = this.cache.length; i < l; i++) {
            try {
                this.cache[i].destroy();
            } catch (ex) {}
        }
        this.cache = [];
    },
    selectGroups: function() {
        return this.grid.getEl().query("div.x-grid-group-hd");
    },
    insertGroupToolbars: function() {
        var groupCmd = this.selectGroups(),
            i;
        if (this.groupCommands) {
            for (i = 0; i < groupCmd.length; i++) {
                this.insertGroupToolbar(this.view, Ext.get(groupCmd[i]));
            }
        }
    },
    initGroupMenu: function(menu, toolbar, shared) {
        menu.items.each(function(item) {
            if (item.on) {
                item.toolbar = toolbar;
                item.column = this;
                if (!Ext.isEmpty(item.command, false)) {
                    if (shared) {
                        item.on("click", function() {
                            var pm = this.parentMenu;
                            while (pm && !pm.shared) {
                                pm = pm.parentMenu;
                            }
                            if (pm && pm.shared && pm.ownerCt && pm.ownerCt.toolbar) {
                                var toolbar = pm.ownerCt.toolbar;
                                toolbar.column.fireEvent("groupcommand", toolbar.column, this.command, toolbar.grid.store.getGroups(toolbar.groupId));
                            }
                        }, item);
                    } else {
                        item.on("click", function() {
                            this.toolbar.column.fireEvent("groupcommand", toolbar.column, this.command, toolbar.grid.store.getGroups(toolbar.groupId));
                        }, item);
                    }
                }
                if (item.menu) {
                    this.initGroupMenu(item.menu, toolbar, shared);
                }
            }
        }, this);
    },
    getRecords: function(groupId) {
        if (groupId) {
            return this.grid.store.getGroups(groupId).children;
        }
    },
    destroy: function() {
        var me = this,
            view;
        if (me.rendered) {
            view = me.grid.getView();
            Ext.each(me.sharedMenus || [], function(menu) {
                if (menu) {
                    menu.destroy();
                }
            });
            delete me.shareMenus;
            me.removeToolbars();
            if (me.overToolbar) {
                me.overToolbar.destroy();
                delete me.overToolbar;
            }
            if (me.commands) {
                if (me.overOnly) {
                    me.view.un("beforerefresh", me.moveToolbar, me);
                    me.view.un("beforeitemupdate", me.moveToolbar, me);
                    me.view.un("beforeitemremove", me.moveToolbar, me);
                    me.view.un("itemmouseenter", me.onItemMouseEnter, me);
                    me.view.un("itemmouseleave", me.onItemMouseLeave, me);
                } else {
                    me.view.un("beforerefresh", me.removeToolbars, me);
                    me.view.un("refresh", me.insertToolbars, me);
                    me.view.un("beforeitemupdate", me.removeToolbar, me);
                    me.view.un("beforeitemremove", me.removeToolbar, me);
                    me.view.un("itemadd", me.itemAdded, me);
                    me.view.un("itemupdate", me.itemUpdated, me);
                }
            }
            if (me.groupCommands) {
                me.view.un("beforerefresh", me.removeToolbars, me);
                me.view.un("refresh", me.insertGroupToolbars, me);
                me.mun(me.grid, "resize", me.onGridResize, me);
                me.view.un('groupclick', me.groupToolbarClick);
                me.view.un("groupexpand", me.insertGroupToolbar, me);
                me.view.un("groupexpand", me.insertGroupToolbar, me);
            }
            if (me.grid.isTree || me.grid.ownerLockable && me.grid.ownerLockable.isTree) {
                me.grid.un("beforeitemcollapse", me.removeNodeToolbars, me._cnrScope);
                me.grid.un("beforeitemmove", me.removeNodeToolbars, me._crScope);
            }
        }
        this.callParent(arguments);
    }
});

Ext.define("Ext.grid.column.ComponentColumn", {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.componentcolumn',
    isColumn: true,
    showDelay: 250,
    hideDelay: 300,
    overOnly: false,
    editor: false,
    pin: false,
    autoWidthComponent: true,
    isComponentColumn: true,
    stopSelection: true,
    pinAllColumns: true,
    moveEditorOnEnter: true,
    moveEditorOnTab: true,
    hideOnUnpin: false,
    disableKeyNavigation: false,
    swallowKeyEvents: true,
    constructor: function(config) {
        var me = this;
        me.callParent(arguments);
        me.cache = [];
        this.addEvents("pin", "unpin", "bind", "unbind", "validateedit", "edit");
        me.userRenderer = me.renderer;
        me.renderer = Ext.Function.bind(me.cmpRenderer, me);
    },
    cmpRenderer: function(value, meta, record, row, col, store, view) {
        meta.tdCls = meta.tdCls || "";
        meta.tdCls += " row-cmp-cell";
        if (this.overOnly) {
            return "<div class='row-cmp-placeholder'>" + this.emptyRenderer(value, meta, record, row, col, store, view) + "</div>";
        }
        return this.emptyRenderer(value, meta, record, row, col, store, view);
    },
    emptyRenderer: function(value, meta, record, row, col, store, view) {
        if (this.userRenderer) {
            if (typeof this.userRenderer === "string") {
                this.userRenderer = Ext.util.Format[this.userRenderer];
            }
            return this.userRenderer.call(this.scope || this.ownerCt, value, meta, record, row, col, store, view);
        } else if (this.editor) {
            return value;
        } else {
            return "<div style='height:16px;width:1px;'></div>";
        }
    },
    initRenderData: function() {
        var me = this;
        me.grid = me.up('tablepanel');
        me.grid.addCls("x-grid-componentcolumn");
        me.view = me.grid.getView();
        if (me.overOnly) {
            me.view.on("beforerefresh", me.onBeforeRefresh, me);
            me.view.on("beforeitemupdate", me.moveComponent, me);
            me.view.on("beforeitemremove", me.moveComponent, me);
            me.view.on("itemmouseenter", me.onItemMouseEnter, me);
            me.view.on("itemmouseleave", me.onItemMouseLeave, me);
        } else {
            me.view.on("beforerefresh", me.removeComponents, me);
            me.view.on("refresh", me.insertComponents, me, {
                buffer: 10
            });
            me.view.on("beforeitemupdate", me.removeComponent, me);
            me.view.on("beforeitemremove", me.removeComponent, me);
            me.view.on("itemadd", me.itemAdded, me);
            me.view.on("itemupdate", me.itemUpdated, me);
        }
        if (me.view.bufferedRenderer) {
            Ext.Function.interceptBefore(me.view.all, "scroll", me.beforeScroll, me);
            Ext.Function.interceptAfter(me.view.all, "scroll", me.afterScroll, me);
            Ext.Function.interceptBefore(me.view.all, "clear", me.beforeAllClear, me);
            Ext.Function.interceptAfter(me.view, "doAdd", Ext.Function.createBuffered(me.afterViewAdd, 50, me));
        }
        if (Ext.isNumber(this.pin) && this.pin > -1) {
            if (this.grid.store.getCount() > 0) {
                this.showComponent(this.pin);
                this.pin = true;
            } else {
                this.grid.store.on("load", function() {
                    this.showComponent(this.pin);
                    this.pin = true;
                }, this, {
                    single: true,
                    delay: 100
                });
            }
        }
        if (this.disableKeyNavigation) {
            var sm = me.grid.getSelectionModel();
            sm.enableKeyNav = false;
            if (sm.keyNav) {
                sm.keyNav.disable();
            }
        }
        if (me.grid.isTree || me.grid.ownerLockable && me.grid.ownerLockable.isTree) {
            me._cnrScope = {
                column: me,
                root: false
            };
            me.grid.on("beforeitemcollapse", me.removeNodeComponents, me._cnrScope);
            me._crScope = {
                column: me,
                root: true
            };
            me.grid.on("beforeitemmove", me.removeNodeComponents, me._crScope);
        }
        me.view.on("cellfocus", this.onFocusCell, this);
        return me.callParent(arguments);
    },
    beforeAllClear: function(removeDom) {
        if (removeDom) {
            this.removeComponents();
        }
    },
    beforeScroll: function(newRecords, direction, removeCount) {
        var me = this,
            i, removeEnd, nc = me.view.all,
            elements = nc.elements;
        if (direction == -1) {
            for (i = (nc.endIndex - removeCount) + 1; i <= nc.endIndex; i++) {
                me.removeComponent(me.view, me.view.getRecord(elements[i]));
            }
        } else {
            removeEnd = nc.startIndex + removeCount;
            for (i = nc.startIndex; i < removeEnd; i++) {
                me.removeComponent(me.view, me.view.getRecord(elements[i]));
            }
        }
    },
    afterScroll: function(newRecords, direction, removeCount) {
        var me = this,
            i, recCount = newRecords.length;
        for (i = 0; i < recCount; i++) {
            me.insertComponentForRecord(newRecords[i]);
        }
    },
    afterViewAdd: function(records, index) {
        var me = this,
            count = records.length,
            i;
        for (i = 0; i < count; i++) {
            me.insertComponentForRecord(records[i]);
        }
    },
    onBeforeRefresh: function() {
        this.hideComponent();
    },
    onFocusCell: function(record, cell, position) {
        if (this.view.headerCt.getHeaderAtIndex(position.column) == this) {
            this.focusComponent(position.row);
        }
    },
    onItemMouseLeave: function(view, record, item, index, e) {
        var me = this;
        if (this.pin) {
            return;
        }
        if (me.showDelayTask) {
            clearTimeout(me.showDelayTask);
            delete me.showDelayTask;
        }
        if (me.hideDelay) {
            if (me.hideDelayTask) {
                clearTimeout(me.hideDelayTask);
            }
            me.hideDelayTask = setTimeout(function() {
                me.hideComponent(view, record, item, index, e);
            }, me.hideDelay);
        } else {
            me.hideComponent(view, record, item, index, e);
        }
    },
    getComponent: function(rowIndex) {
        if (this.overOnly) {
            return this.overComponent;
        }
        var record = Ext.isNumber(rowIndex) ? (this.grid.store.getAt ? this.grid.store.getAt(rowIndex) : this.view.getRecord(this.view.getNode(rowIndex))) : rowIndex,
            i, l;
        for (i = 0, l = this.cache.length; i < l; i++) {
            if (this.cache[i].id == record.id) {
                return this.cache[i].cmp;
            }
        }
        return null;
    },
    focusComponent: function(rowIndex) {
        var cmp = this.getComponent(rowIndex);
        if (cmp && cmp.hidden !== true && cmp.focus) {
            cmp.focus();
        }
    },
    moveComponent: function(view, record, index) {
        if (Ext.isDefined(index) && this.overComponent && this.overComponent.column && this.overComponent.column.rowIndex == index) {
            this.hideComponent();
        }
    },
    hideComponent: function(view, record, item, index, e) {
        delete this.hideDelayTask;
        if (!this.overOnly) {
            return;
        }
        var hideOtherComponents = view === true,
            rowIndex = this.overComponent && this.overComponent.column ? this.overComponent.column.rowIndex : -1;
        if (this.showDelayTask) {
            clearTimeout(this.showDelayTask);
            delete this.showDelayTask;
        }
        if (this.overComponent && this.overComponent.rendered && this.overComponent.hidden !== true) {
            if (!item) {
                this.doComponentHide();
            } else {
                this.doComponentHide(item);
            }
        }
        if (hideOtherComponents && this.overComponent) {
            var columns = this.view.getHeaderCt().getGridColumns(),
                item = this.grid.getView().getNode(rowIndex);
            Ext.each(columns, function(column) {
                if (column != this && column.hideComponent) {
                    column.hideComponent(item);
                }
            }, this);
        }
    },
    pinOverComponent: function(preventPinAll) {
        if (!this.overOnly) {
            return;
        }
        this.pin = true;
        this.fireEvent("pin", this, this.overComponent);
        if (this.pinAllColumns && preventPinAll !== true) {
            var columns = this.view.getHeaderCt().getGridColumns();
            Ext.each(columns, function(column) {
                if (column != this && column.pinOverComponent) {
                    column.pinOverComponent(true);
                }
            }, this);
        }
    },
    unpinOverComponent: function(preventUnpinAll) {
        if (!this.overOnly) {
            return;
        }
        this.pin = false;
        if (this.hideOnUnpin) {
            this.hideComponent();
        }
        this.fireEvent("unpin", this, this.overComponent);
        if (this.pinAllColumns && preventUnpinAll !== true) {
            var columns = this.view.getHeaderCt().getGridColumns();
            Ext.each(columns, function(column) {
                if (column != this && column.unpinOverComponent) {
                    column.unpinOverComponent(true);
                }
            }, this);
        }
    },
    doComponentHide: function(item) {
        var ce = this.overComponent.getEl(),
            el = Ext.net.ResourceMgr.getAspForm() || Ext.getBody(),
            div = item ? this.getRenderTarget(item) : null;
        this.restoreLastPlaceholder();
        if (div) {
            div.down('.row-cmp-placeholder').removeCls("x-hide-display");
        }
        this.overComponent.hide(false);
        if (this.overComponent.column) {
            this.fireEvent("unbind", this, this.overComponent, this.overComponent.record, this.overComponent.column && this.overComponent.column.index, this.grid);
        }
        this.onUnbind(this.overComponent);
        if (this.overComponent._inGrid !== false) {
            el.dom.appendChild(ce.dom);
            this.overComponent._inGrid = false;
        }
    },
    onItemMouseEnter: function(view, record, item, index, e) {
        var me = this;
        if (me.hideDelayTask) {
            clearTimeout(me.hideDelayTask);
            delete me.hideDelayTask;
        }
        if (this.pin || (this.overComponent && this.overComponent.record && this.overComponent.record.id == record.id)) {
            return;
        }
        if (me.showDelay) {
            if (me.showDelayTask) {
                clearTimeout(me.showDelayTask);
            }
            me.showDelayTask = setTimeout(function() {
                me.showComponent(record, item, index, e);
            }, me.showDelay);
        } else {
            me.showComponent(record, item, index, e);
        }
    },
    restoreLastPlaceholder: function() {
        if (this.lastComponentDiv) {
            if (this.lastComponentDiv.dom) {
                try {
                    this.lastComponentDiv.down('.row-cmp-placeholder').removeCls("x-hide-display");
                } catch (e) {}
            }
            delete this.lastComponentDiv;
        }
    },
    getRenderTarget: function(node) {
        var td = this.select(node)[0];
        return td ? Ext.get(td).first("div") : null;
    },
    showComponent: function(record, item, index, e) {
        delete this.showDelayTask;
        if (!this.overOnly) {
            return;
        }
        if (Ext.isNumber(record)) {
            record = this.grid.store.getAt ? this.grid.store.getAt(record) : this.view.getRecord(this.view.getNode(record));
        }
        var showOtherComponents = item === true;
        if (!Ext.isDefined(index)) {
            index = this.grid.store.indexOf ? this.grid.store.indexOf(record) : (record.parentNode ? record.parentNode.indexOf(record) : 0);
            item = this.grid.getView().getNode(index);
        }
        if (this.hideDelayTask) {
            clearTimeout(this.hideDelayTask);
            delete this.hideDelayTask;
        }
        if (!this.overComponent) {
            tpl = Ext.isFunction(this.component) ? this.component.call(this) : this.component;
            this.overComponents = [];
            for (var i = 0; i < tpl.length; i++) {
                var cmp, evts;
                cmp = Ext.ComponentManager.create(tpl[i]);
                this.overComponents.push(cmp);
                this.initCmp(cmp);
                if (this.pinEvents) {
                    evts = Ext.Array.from(this.pinEvents);
                    Ext.each(evts, function(evt) {
                        var evtCfg = evt.split(":");
                        cmp.on(evtCfg[0], this.pinOverComponent, this, evtCfg.length > 1 ? {
                            defer: parseInt(evtCfg[1], 10)
                        } : {});
                    }, this);
                }
                if (this.unpinEvents) {
                    evts = Ext.Array.from(this.unpinEvents);
                    Ext.each(evts, function(evt) {
                        var evtCfg = evt.split(":");
                        cmp.on(evtCfg[0], this.unpinOverComponent, this, evtCfg.length > 1 ? {
                            defer: parseInt(evtCfg[1], 10)
                        } : {});
                    }, this);
                }
                this.overComponent = this.overComponents[0];
            }
        }
        if (this.overComponent) {
            if (this.overComponent.hidden !== true && this.overComponent.record) {
                this.fireEvent("unbind", this, this.overComponent, this.overComponent.record, this.overComponent.column && this.overComponent.column.index, this.grid);
                this.onUnbind(this.overComponent);
            }
            var e = {
                    config: this.overComponents,
                    record: record,
                    rowIndex: index,
                    grid: this.grid
                },
                hide = false;
            beforeBind = this.fireEvent("beforebind", this, e);
            if (beforeBind === false || e.cancel === true) {
                hide = true;
            }
            if (Ext.isArray(e.config)) {
                e.config = e.config[0];
            }
            if (this.overComponent != e.config) {
                delete this.overComponent.column;
                this.hideComponent();
            }
            this.overComponent = e.config;
            var cmp = this.overComponent,
                div = this.getRenderTarget(item);
            if (!div) {
                hide = true;
            }
            this.restoreLastPlaceholder();
            this.lastComponentDiv = div;
            if (div) {
                div.down('.row-cmp-placeholder').addCls("x-hide-display");
                div.addCls("row-cmp-cell-ct");
                if (cmp.rendered) {
                    div.appendChild(cmp.getEl());
                } else {
                    cmp.render(div);
                }
            }
            this.overComponent._inGrid = true;
            this.overComponent.show(false);
            cmp.record = record;
            cmp.column = {
                grid: this.grid,
                column: this,
                rowIndex: index,
                record: record
            };
            if (hide || this.fireEvent("bind", this, cmp, record, index, this.grid) === false) {
                delete cmp.column;
                cmp._ignoreUnbind = true;
                this.hideComponent();
                return;
            }
            delete cmp._ignoreUnbind;
            this.onBind(cmp, record);
            if (this.overComponent.hasFocus) {
                var selectText = !!this.overComponent.getFocusEl().dom.select && this.overComponent.selectOnFocus === true;
                this.overComponent.focus(selectText, 10);
            }
            if (showOtherComponents) {
                var columns = this.view.getHeaderCt().getGridColumns();
                Ext.each(columns, function(column) {
                    if (column != this && column.showComponent) {
                        column.showComponent(record);
                    }
                }, this);
            }
        }
    },
    itemUpdated: function(record, index, node) {
        this.insertComponentForRecord(record, node);
    },
    itemAdded: function(records, index, nodes) {
        for (var i = 0, len = records.length; i < len; i++) {
            this.insertComponentForRecord(records[i], nodes && nodes[i], i === (len - 1));
        }
    },
    select: function(row) {
        var classSelector = "x-grid-cell-" + this.id + ".row-cmp-cell",
            el = row ? Ext.fly(row) : this.grid.getEl();
        return el.query("td." + classSelector);
    },
    insertComponentForRecord: function(record, node, refreshSize) {
        var tpl, cmp, div, e, node, record, beforeBind, i, width = 0;
        if (record.isCollapsedPlaceholder) {
            return;
        }
        if (!node) {
            node = this.view.getNode(record, true);
        }
        if (!node) {
            return;
        }
        div = Ext.fly(node).down(this.getCellSelector() + " div");
        if (!div) {
            return;
        }
        if (this.view.store.indexOf) {
            i = this.view.store.indexOf(record);
        } else if (record.parentNode) {
            i = record.parentNode.indexOf(record);
        }
        tpl = Ext.isFunction(this.component) ? this.component.call(this) : Ext.clone(this.component);
        e = {
            config: tpl,
            record: record,
            rowIndex: i,
            grid: this.grid
        };
        beforeBind = this.fireEvent("beforebind", this, e);
        if (beforeBind === false || e.cancel === true) {
            return;
        }
        tpl = e.config;
        if (Ext.isArray(tpl)) {
            tpl = tpl[0];
        }
        cmp = Ext.ComponentManager.create(tpl);
        this.initCmp(cmp);
        cmp.record = record;
        this.cache.push({
            id: record.id,
            cmp: cmp
        });
        div.dom.innerHTML = "";
        div.addCls("row-cmp-cell-ct");
        cmp.render(div);
        cmp.column = {
            grid: this.grid,
            column: this,
            rowIndex: i,
            record: record
        };
        if (this.fireEvent("bind", this, cmp, record, i, this.grid) === false) {
            delete cmp.column;
            cmp.destroy();
            return;
        }
        this.onBind(cmp, record);
        if (!this.view._bufferedRefreshSize) {
            this.view._bufferedRefreshSize = Ext.Function.createBuffered(this.view.refreshSize, 10, this.view);
        }
        if (refreshSize !== false) {
            this.view._bufferedRefreshSize();
        }
    },
    insertComponents: function() {
        var records = this.view.getViewRange(),
            i, len = (records && records.length) || 0;
        for (i = 0; i < len; i++) {
            this.insertComponentForRecord(records[i], null, i === (len - 1));
        }
    },
    onBind: function(cmp, record) {
        if (this.editor && cmp.setValue && this.dataIndex) {
            this.settingValue = true;
            cmp.setValue(record.get(this.dataIndex));
            this.settingValue = false;
        }
        if (this.overOnly) {
            this.activeRecord = {
                cmp: cmp,
                record: record,
                rowIndex: cmp.column && cmp.column.rowIndex
            };
        }
    },
    onUnbind: function(cmp) {
        if (this.editor) {
            if (this.overOnly) {
                this.onSaveValue(cmp, true);
            }
        }
        delete cmp.column;
        delete cmp.record;
    },
    initCmp: function(cmp) {
        this.on("resize", this.onColumnResize, {
            column: this,
            cmp: cmp
        });
        this.on("show", this.onColumnResize, {
            column: this,
            cmp: cmp
        });
        if (!Ext.isDefined(cmp.margin)) {
            cmp.margin = 1;
        }
        this.onColumnResize.call({
            column: this,
            cmp: cmp
        });
        cmp.on("focus", function(cmp) {
            this.activeRecord = {
                cmp: cmp,
                record: cmp.record,
                rowIndex: cmp.column && cmp.column.rowIndex
            };
        }, this);
        cmp.on("specialkey", this.onCmpSpecialKey, cmp);
        if (this.swallowKeyEvents) {
            cmp.on("afterrender", function(cmp) {
                cmp.getEl().swallowEvent(["keyup", "keydown", "keypress"]);
            });
        }
        if (this.editor) {
            cmp.addCls(Ext.baseCSSPrefix + "small-editor");
            cmp.addCls(Ext.baseCSSPrefix + "grid-editor");
            if ((this.overOnly && this.saveOnChange) || !this.overOnly) {
                cmp.on("change", this.onSaveEvent, this);
            }
        }
    },
    onSaveEvent: function(cmp) {
        if (this.overOnly) {
            this.forceRefresh = true;
        }
        this.onSaveValue(cmp);
    },
    onSaveValue: function(cmp, deferRowRefresh) {
        if (cmp._ignoreUnbind) {
            return;
        }
        var me = this,
            value = cmp.getValue(),
            ev, headerCt, headers, row, colIndex;
        if (me.settingValue || (cmp.record.get(me.dataIndex) == value) || !cmp.isValid()) {
            if (!deferRowRefresh || !this.forceRefresh && deferRowRefresh) {
                return;
            }
        }
        headerCt = this.view.getHeaderCt();
        headers = headerCt.getGridColumns();
        colIndex = Ext.Array.indexOf(headers, this);
        row = cmp.column ? this.view.getNode(cmp.column.rowIndex) : null;
        ev = {
            grid: me.grid,
            cmp: cmp,
            record: cmp.record,
            field: me.dataIndex,
            value: value,
            originalValue: cmp.record.get(me.dataIndex),
            row: row,
            column: me,
            rowIdx: cmp.column ? cmp.column.rowIndex : null,
            colIdx: colIndex,
            cancel: false
        };
        if (this.fireEvent("validateedit", this, ev) === false || ev.cancel === true) {
            return;
        }
        cmp.record.beginEdit();
        cmp.record.set(me.dataIndex, cmp.getValue());
        cmp.record.endEdit(true);
        this.fireEvent("edit", this, ev);
        if (me.silentSave === false) {
            deferRowRefresh = true;
        }
        if (deferRowRefresh) {
            delete this.forceRefresh;
            me.grid.refreshComponents = me.grid.refreshComponents || {};
            var rowIndex = cmp.column && cmp.column.rowIndex;
            if (cmp.column && !me.grid.refreshComponents[rowIndex]) {
                me.grid.refreshComponents[rowIndex] = setTimeout(function() {
                    me.view.refreshNode(rowIndex);
                    delete me.grid.refreshComponents[rowIndex];
                }, 10);
            }
        }
    },
    focusColumn: function(e, rowIndex, cmp) {
        var headerCt = this.view.getHeaderCt(),
            headers = headerCt.getGridColumns(),
            colIndex = Ext.Array.indexOf(headers, this),
            rowCount = this.grid.store.getCount(),
            firstCol = 0,
            lastCol = headers.length - 1,
            found = false,
            newCmp;
        for (rowIndex; e.shiftKey ? (rowIndex >= 0) : (rowIndex < rowCount); e.shiftKey ? rowIndex-- : rowIndex++) {
            for (e.shiftKey ? --colIndex : ++colIndex; e.shiftKey ? (colIndex >= firstCol) : (colIndex <= lastCol); e.shiftKey ? colIndex-- : colIndex++) {
                if (headers[colIndex].hidden && headers[colIndex].isComponentColumn !== true) {
                    continue;
                }
                newCmp = headers[colIndex].getComponent(rowIndex);
                if (newCmp && newCmp.hidden !== true) {
                    newCmp.focus();
                    found = true;
                    break;
                }
            }
            colIndex = e.shiftKey ? lastCol + 1 : -1;
            if (found) {
                break;
            }
        }
        if (found && cmp.triggerBlur) {
            cmp.triggerBlur();
        }
    },
    onCmpSpecialKey: function(cmp, e) {
        var store = cmp.column.grid.store,
            grid = cmp.column.grid,
            column = cmp.column.column;
        switch (e.getKey()) {
            case e.TAB:
                column.focusColumn(e, cmp.column.rowIndex, cmp);
                e.stopEvent();
                return false;
            case e.ENTER:
                if (column.moveEditorOnEnter === false || (cmp.getPicker && cmp.isExpanded)) {
                    return;
                }
                var pos = cmp.column.rowIndex,
                    newPos;
                if (!e.shiftKey && !e.ctrlKey) {
                    newPos = pos + 1;
                    if (newPos >= store.getCount()) {
                        newPos = -1;
                    }
                } else {
                    if (e.shiftKey) {
                        newPos = pos - 1;
                    }
                    if (e.ctrlKey) {
                        newPos = 0;
                    }
                }
                if (newPos > -1 && pos != newPos) {
                    column.focusComponent(newPos);
                    if (cmp.triggerBlur) {
                        cmp.triggerBlur();
                    }
                }
                e.stopEvent();
                return false;
        }
    },
    onColumnResize: function() {
        if (this.column.overOnly && this.cmp.hidden) {
            if (!this.cmp.resizeListen) {
                this.cmp.on("show", this.column.fitComponent, this, {
                    single: true
                });
                this.cmp.resizeListen = true;
            }
        } else {
            this.column.fitComponent.call(this);
        }
    },
    fitComponent: function() {
        delete this.cmp.resizeListen;
        if (this.column.autoWidthComponent) {
            var lr;
            if (this.cmp.rendered) {
                lr = this.cmp.getEl().getMargin('lr');
            } else {
                var box = Ext.util.Format.parseBox(this.cmp.margin || 0);
                lr = box.left + box.right;
            }
            this.cmp.setWidth(this.column.getWidth() - lr);
        }
    },
    removeNodeComponents: function(node) {
        node.cascadeBy(function(n) {
            if (n != node || this.root) {
                this.column.removeComponent(this.column.view, n);
            }
        }, this);
    },
    removeComponent: function(view, record, rowIndex) {
        for (var i = 0, l = this.cache.length; i < l; i++) {
            if (this.cache[i].id == record.id) {
                try {
                    var cmp = this.cache[i].cmp;
                    this.fireEvent("unbind", this, cmp, cmp.record, cmp.column && cmp.column.index, this.grid);
                    this.onUnbind(cmp);
                    cmp.destroy();
                    Ext.Array.remove(this.cache, this.cache[i]);
                } catch (ex) {}
                break;
            }
        }
    },
    removeComponents: function() {
        for (var i = 0, l = this.cache.length; i < l; i++) {
            try {
                var cmp = this.cache[i].cmp;
                this.fireEvent("unbind", this, cmp, cmp.record, cmp.column && cmp.column.index, this.grid);
                this.onUnbind(cmp);
                cmp.destroy();
            } catch (ex) {}
        }
        this.cache = [];
    },
    processEvent: function(type, view, cell, recordIndex, cellIndex, e) {
        if (type == "mousedown" && this.stopSelection) {
            return false;
        }
        return this.callParent(arguments);
    },
    destroy: function() {
        var me = this,
            view;
        if (me.rendered) {
            view = me.grid.getView();
            me.removeComponents();
            if (me.overComponent) {
                me.overComponent.destroy();
                delete me.overComponent;
            }
            if (me.overOnly) {
                me.view.un("beforerefresh", me.onBeforeRefresh, me);
                me.view.un("beforeitemupdate", me.moveComponent, me);
                me.view.un("beforeitemremove", me.moveComponent, me);
                me.view.un("itemmouseenter", me.onItemMouseEnter, me);
                me.view.un("itemmouseleave", me.onItemMouseLeave, me);
            } else {
                me.view.un("beforerefresh", me.removeComponents, me);
                me.view.un("refresh", me.insertComponents, me);
                me.view.un("beforeitemupdate", me.removeComponent, me);
                me.view.un("beforeitemremove", me.removeComponent, me);
                me.view.un("itemadd", me.itemAdded, me);
                me.view.un("itemupdate", me.itemUpdated, me);
            }
            if (me.grid.isTree || me.grid.ownerLockable && me.grid.ownerLockable.isTree) {
                me.grid.un("beforeitemcollapse", me.removeNodeComponents, me._cnrScope);
                me.grid.un("beforeitemmove", me.removeNodeComponents, me._crScope);
            }
            me.view.un("cellfocus", me.onFocusCell, me);
        }
        me.callParent(arguments);
    }
});

Ext.define('Ext.ux.CheckColumn', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.checkcolumn',
    stopSelection: true,
    tdCls: Ext.baseCSSPrefix + 'grid-cell-checkcolumn',
    innerCls: Ext.baseCSSPrefix + 'grid-cell-inner-checkcolumn',
    clickTargetName: 'el',
    constructor: function() {
        this.addEvents('beforecheckchange', 'checkchange');
        this.callParent(arguments);
    },
    processEvent: function(type, view, cell, recordIndex, cellIndex, e, record, row) {
        var me = this,
            key = type === 'keydown' && e.getKey(),
            mousedown = type == 'mousedown';
        if (me.editable && (mousedown || (key == e.ENTER || key == e.SPACE))) {
            var store = view.panel.store,
                dataIndex = me.dataIndex,
                checked = !record.get(dataIndex),
                eventTarget = view.panel.editingPlugin || view.panel;
            var ev = {
                grid: view.panel,
                record: record,
                field: dataIndex,
                value: record.get(me.dataIndex),
                row: row,
                column: me,
                rowIdx: recordIndex,
                colIdx: cellIndex,
                cancel: false
            };
            if (me.fireEvent('beforecheckchange', me, recordIndex, record, checked) === false || eventTarget.fireEvent("beforeedit", eventTarget, ev) === false || ev.cancel === true) {
                return !me.stopSelection;
            }
            ev.originalValue = ev.value;
            ev.value = checked;
            if (eventTarget.fireEvent("validateedit", eventTarget, ev) === false || ev.cancel === true) {
                return !me.stopSelection;
            }
            if (me.singleSelect) {
                store.suspendEvents();
                store.each(function(record, i) {
                    var value = (i == recordIndex);
                    if (value != record.get(dataIndex)) {
                        record.set(dataIndex, value);
                    }
                });
                store.resumeEvents();
                store.fireEvent("datachanged", store);
            } else {
                record.set(dataIndex, checked);
            }
            me.fireEvent('checkchange', me, recordIndex, record, checked);
            eventTarget.fireEvent('edit', eventTarget, ev);
            if (mousedown) {
                var browserEvent = e.browserEvent;
                if (browserEvent) {
                    Ext.EventManager.stopPropagation(browserEvent);
                }
                e.preventDefault();
            }
            if (!me.stopSelection) {
                view.selModel.selectByPosition({
                    row: recordIndex,
                    column: cellIndex
                });
            }
            return false;
        } else {
            return me.callParent(arguments);
        }
    },
    renderer: function(value) {
        var cssPrefix = Ext.baseCSSPrefix,
            cls = [cssPrefix + 'grid-checkheader'];
        if (value) {
            cls.push(cssPrefix + 'grid-checkheader-checked');
        }
        return '<div class="' + cls.join(' ') + '">&#160;</div>';
    }
});

Ext.define('Ext.ux.grid.column.ProgressBar', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.progressbarcolumn',
    cls: 'x-progress-column',
    progressCls: 'x-progress',
    progressText: '{0} %',
    hideIfEmpty: false,
    constructor: function() {
        var me = this;
        me.callParent(arguments);
        me.renderer = Ext.Function.bind(me.renderer, me);
        me.on("resize", this.onColumnResize);
    },
    initRenderData: function() {
        var me = this;
        me.grid = me.up('tablepanel');
        me.view = me.grid.getView();
        return me.callParent(arguments);
    },
    renderer: function(value, meta) {
        var me = this,
            text, cls = me.progressCls,
            pCls, cWidth = me.getWidth(true) - 2;
        if (me.hideIfEmpty && (!value && value !== 0 || value < 0)) {
            return "";
        }
        value = value || 0;
        text = Ext.String.format(me.progressText, Math.round(value * 100));
        pCls = cls + ' ' + cls + '-' + me.ui;
        meta.tdCls = "x-progress-column-cell";
        meta.style = "padding:0px;margin:0px;";
        v = '<div class="' + pCls + '" style="margin:1px 1px 1px 1px;width:' + cWidth + 'px;"><div class="' + cls + '-text ' + cls + '-text-back" style="width:' + (cWidth - 2) + 'px;">' +
            text + '</div>' + '<div class="' + cls + '-bar ' + cls + '-bar-' + me.ui + '" style="width: ' + value * 100 + '%;">' + '<div class="' + cls + '-text" style="width:' + (cWidth - 2) + 'px;">' + '<div>' + text + '</div>' + '</div>' + '</div></div>'
        return v;
    },
    getCellSelector: function() {
        return '.' + Ext.baseCSSPrefix + 'grid-cell-' + this.getItemId();
    },
    onColumnResize: function() {
        var me = this,
            cls = me.progressCls,
            cWidth = me.getWidth(true) - 2,
            view = me.view;
        view.el.select(view.getCellInnerSelector(this) + " > div." + cls).setWidth(cWidth);
        view.el.select(view.getCellInnerSelector(this) + " div." + cls + "-text").setWidth(cWidth - 2);
    }
});

Ext.grid.header.DragZone.override({
    onBeforeDrag: function(data, e) {
        return !(this.headerCt.dragging || this.disabled || e.getTarget('.x-grid-header-widgets', this.headerCt));
    }
});

Ext.grid.header.DropZone.override({
    onNodeDrop: function(node, dragZone, e, data) {
        if (this.valid) {
            var dragHeader = data.header,
                dropLocation = data.dropLocation,
                targetHeader = dropLocation.header,
                fromCt = dragHeader.ownerCt,
                localFromIdx = fromCt.items.indexOf(dragHeader),
                toCt = targetHeader.ownerCt,
                localToIdx = toCt.items.indexOf(targetHeader),
                headerCt = this.headerCt,
                columnManager = headerCt.columnManager,
                fromIdx = columnManager.getHeaderIndex(dragHeader),
                toIdx = columnManager.getHeaderIndex(targetHeader),
                colsToMove = dragHeader.isGroupHeader ? dragHeader.query(':not([isGroupHeader]):not([isComponentHeader])').length : 1,
                sameCt = fromCt === toCt,
                scrollerOwner, savedWidth;
            if (dropLocation.pos === 'after') {
                localToIdx++;
                toIdx += targetHeader.isGroupHeader ? targetHeader.query(':not([isGroupHeader]):not([isComponentHeader])').length : 1;
            }
            if (data.isLock) {
                scrollerOwner = fromCt.up('[scrollerOwner]');
                scrollerOwner.lock(dragHeader, localToIdx);
                data.isLock = false;
                this.onNodeDrop(node, dragZone, e, data);
            } else if (data.isUnlock) {
                scrollerOwner = fromCt.up('[scrollerOwner]');
                scrollerOwner.unlock(dragHeader, localToIdx);
                data.isUnlock = false;
                this.onNodeDrop(node, dragZone, e, data);
            } else {
                this.invalidateDrop();
                savedWidth = dragHeader.getWidth();
                if (sameCt) {
                    if (localToIdx === localFromIdx) {
                        headerCt.onHeaderMoved(dragHeader, colsToMove, fromIdx, toIdx);
                        return;
                    }
                    if (localToIdx > localFromIdx) {
                        localToIdx -= 1;
                    }
                }
                Ext.suspendLayouts();
                if (sameCt) {
                    toCt.move(localFromIdx, localToIdx);
                } else {
                    fromCt.remove(dragHeader, false);
                    toCt.insert(localToIdx, dragHeader);
                }
                if (toCt.isGroupHeader) {
                    if (!sameCt) {
                        dragHeader.savedFlex = dragHeader.flex;
                        delete dragHeader.flex;
                        dragHeader.width = savedWidth;
                    }
                } else {
                    if (dragHeader.savedFlex) {
                        dragHeader.flex = dragHeader.savedFlex;
                        delete dragHeader.width;
                    }
                }
                headerCt.purgeCache();
                Ext.resumeLayouts(true);
                headerCt.onHeaderMoved(dragHeader, colsToMove, fromIdx, toIdx);
            }
        }
    }
});

Ext.grid.plugin.HeaderResizer.override({
    afterHeaderRender: Ext.Function.createSequence(Ext.grid.plugin.HeaderResizer.prototype.afterHeaderRender, function() {
        this.tracker.on("beforedragstart", function(tracker, e) {
            return !e.getTarget('.x-grid-header-widgets', this.headerCt);
        }, this);
    })
});

Ext.grid.plugin.Editing.override({
    onReconfigure: function() {
        var grid = this.grid,
            view, columns;
        grid = grid.ownerLockable ? grid.ownerLockable : grid;
        view = grid.getView();
        if (view.isLockingView) {
            columns = view.lockedGrid.headerCt.getGridColumns();
            columns = columns.concat(view.normalGrid.headerCt.getGridColumns());
        } else {
            columns = view.headerCt.getGridColumns();
        }
        this.initFieldAccessors(columns);
    }
});
Ext.grid.plugin.CellEditing.override({
    getColumnField: function(columnHeader, defaultField, record) {
        if (columnHeader instanceof Ext.ux.CheckColumn || columnHeader instanceof Ext.grid.column.Action || columnHeader instanceof Ext.grid.RowNumberer || columnHeader instanceof Ext.grid.column.CommandColumn || columnHeader instanceof Ext.grid.column.ComponentColumn || columnHeader instanceof Ext.grid.column.ImageCommand) {
            return;
        }
        var field = columnHeader.field;
        if (!field && columnHeader.editor) {
            field = columnHeader.editor;
            delete columnHeader.editor;
        }
        if (!field && defaultField) {
            field = defaultField;
        }
        if (!field || this.fieldFromEditors) {
            if (columnHeader.editors) {
                field = this.getFromEditors(record, columnHeader, columnHeader.editors, columnHeader.editorStrategy, columnHeader);
                this.fieldFromEditors = false;
            }
            if ((!field || this.fieldFromEditors) && this.grid.editors) {
                field = this.getFromEditors(record, columnHeader, this.grid.editors, this.grid.editorStrategy, this.grid);
            }
            this.fieldFromEditors = true;
        }
        if (field) {
            if (Ext.isString(field)) {
                field = {
                    xtype: field
                };
            }
            if (!field.isFormField) {
                field = Ext.ComponentManager.create(field, this.defaultFieldXType);
            }
            columnHeader.field = field;
            Ext.apply(field, {
                name: columnHeader.dataIndex
            });
            columnHeader.activeEditorId = field instanceof Ext.grid.CellEditor ? field.field.getItemId() : field.getItemId();
            return field;
        }
    },
    getFromEditors: function(record, column, editors, editorStrategy, scope) {
        var editor, index;
        if (editorStrategy) {
            editor = editorStrategy.call(scope, record, column, editors, this.grid);
            if (Ext.isNumber(editor)) {
                index = editor;
                editor = editors[index];
            }
            index = Ext.Array.indexOf(editors, editor);
        } else {
            editor = editors[0];
            index = 0;
        }
        if (editor && !(editor instanceof Ext.grid.CellEditor)) {
            if (!(editor instanceof Ext.form.field.Base)) {
                editor = Ext.ComponentManager.create(editor, 'textfield');
            }
            editor = editors[index] = new Ext.grid.CellEditor({
                field: editor,
                floating: true
            });
        }
        if (editor) {
            Ext.applyIf(editor, {
                editorId: editor.field.getItemId(),
                editingPlugin: this,
                ownerCt: this.grid,
                floating: true
            });
        }
        return editor;
    },
    getEditor: function(record, column) {
        var me = this,
            editors = me.editors,
            editorId = me.getEditorId(column),
            editor = editors.getByKey(editorId),
            editorOwner = me.grid.ownerLockable || me.grid;
        if (!editor) {
            editor = column.getEditor(record);
            if (!editor) {
                return false;
            }
            if (!(editor instanceof Ext.grid.CellEditor)) {
                editor = new Ext.grid.CellEditor({
                    floating: true,
                    editorId: editorId,
                    field: editor
                });
            } else {
                Ext.applyIf(editor, {
                    floating: true,
                    editorId: editorId
                });
            }
            editorOwner.add(editor);
            editor.on({
                scope: me,
                specialkey: me.onSpecialKey,
                complete: me.onEditComplete,
                canceledit: me.cancelEdit
            });
            column.on('removed', me.cancelActiveEdit, me);
            editors.add(editor);
        }
        if (column.isTreeColumn) {
            editor.isForTree = column.isTreeColumn;
            editor.addCls(Ext.baseCSSPrefix + 'tree-cell-editor')
        }
        editor.grid = me.grid;
        editor.editingPlugin = me;
        return editor;
    },
    initFieldAccessors: function(columns) {
        if (columns.isGroupHeader) {
            columns = columns.getGridColumns();
        } else if (!Ext.isArray(columns)) {
            columns = [columns];
        }
        var me = this,
            c, cLen = columns.length,
            column;
        for (c = 0; c < cLen; c++) {
            column = columns[c];
            if (!column.getEditor) {
                column.getEditor = function(record, defaultField) {
                    return me.getColumnField(this, defaultField, record);
                };
            }
            if (!column.hasEditor) {
                column.hasEditor = function() {
                    return me.hasColumnField(this);
                };
            }
            if (!column.setEditor) {
                column.setEditor = function(field) {
                    me.setColumnField(this, field);
                };
            }
        }
    },
    getEditorId: function(column) {
        return column.activeEditorId || column.getItemId();
    },
    showEditor: function(ed, context, value) {
        var me = this,
            record = context.record,
            columnHeader = context.column,
            sm = me.grid.getSelectionModel(),
            selection = sm.getCurrentPosition(me.grid.view),
            otherView = selection && selection.view;
        if (otherView && otherView !== me.view) {
            return me.lockingPartner.showEditor(ed, me.lockingPartner.getEditingContext(selection.record, selection.columnHeader), value);
        }
        me.setEditingContext(context);
        me.setActiveEditor(ed);
        me.setActiveRecord(record);
        me.setActiveColumn(columnHeader);
        if (sm.selectByPosition && (!selection || selection.column !== context.colIdx || selection.row !== context.rowIdx)) {
            if (!sm.isCellModel && sm.select) {
                sm.select(record);
            } else {
                sm.selectByPosition({
                    row: context.rowIdx,
                    column: context.colIdx,
                    view: me.view
                });
            }
        }
        ed.startEdit(me.getCell(record, columnHeader), value, context);
        me.editing = true;
        me.scroll = me.view.el.getScroll();
    }
});

Ext.grid.plugin.DragDrop.override({
    init: function(view) {
        view.on("afterrender", this.onViewRender, this, {
            single: true
        });
    }
});

Ext.grid.plugin.RowEditing.override({
    saveBtnText: 'Update',
    cancelBtnText: 'Cancel',
    errorsText: 'Errors',
    dirtyText: 'You need to commit or cancel your changes',
    getEditor: function() {
        var me = this;
        if (!me.editor) {
            me.editor = me.initEditor();
            if (me.editor.rendered) {
                me.setHandlers();
            } else {
                me.editor.on("afterrender", me.setHandlers, me, {
                    single: true
                });
            }
        }
        return me.editor;
    },
    setHandlers: function() {
        if (this.saveHandler) {
            var btn = this.editor.getFloatingButtons().down("#update"),
                enterBinding = Ext.Array.findBy(this.editor.keyNav.map.bindings, function(b) {
                    return b.key === Ext.EventObject.ENTER;
                });
            btn.handler = enterBinding.handler = this.saveHandler;
            btn.scope = enterBinding.scope = this.editor;
        }
    }
});

Ext.define('Ext.ux.RowExpander', {
    extend: 'Ext.AbstractPlugin',
    lockableScope: 'normal',
    requires: ['Ext.grid.feature.RowBody', 'Ext.grid.feature.RowWrap'],
    alias: 'plugin.rowexpander',
    mixins: {
        observable: 'Ext.util.Observable'
    },
    isRowExpander: true,
    rowBodyTpl: null,
    expandOnEnter: true,
    expandOnDblClick: true,
    selectRowOnExpand: false,
    hiddenColumn: false,
    rowBodyTrSelector: '.x-grid-rowbody-tr',
    rowBodyHiddenCls: 'x-grid-row-body-hidden',
    rowCollapsedCls: 'x-grid-row-collapsed',
    swallowBodyEvents: false,
    addCollapsedCls: {
        before: function(values, out) {
            var me = this.rowExpander;
            if (!me.recordsExpanded[values.record.internalId]) {
                values.itemClasses.push(me.rowCollapsedCls);
            }
        },
        priority: 500
    },
    constructor: function(config) {
        this.addEvents("beforeexpand", "expand", "beforecollapse", "collapse");
        this.callParent(arguments);
        this.mixins.observable.constructor.call(this);
    },
    setCmp: function(grid) {
        var me = this,
            rowBodyTpl, features;
        this.callParent(arguments);
        this.recordsExpanded = {};
        this.preventsExpanding = {};
        this.bodyContent = {};
        if (!this.rowBodyTpl) {
            this.rowBodyTpl = "";
        }
        if (!Ext.isEmpty(this.rowBodyTpl) && (this.loader || this.component)) {
            this.cmpBodyTpl = (this.rowBodyTpl instanceof Ext.XTemplate) ? this.rowBodyTpl : Ext.create('Ext.XTemplate', this.rowBodyTpl);
            this.rowBodyTpl = "";
        }
        var rowBodyTpl = (this.rowBodyTpl instanceof Ext.XTemplate) ? this.rowBodyTpl : Ext.create('Ext.XTemplate', this.rowBodyTpl),
            features = [{
                ftype: 'rowbody',
                lockableScope: 'normal',
                recordsExpanded: this.recordsExpanded,
                rowBodyHiddenCls: this.rowBodyHiddenCls,
                rowCollapsedCls: this.rowCollapsedCls,
                setupRowData: this.getRowBodyFeatureData,
                setup: this.setup,
                expander: this,
                getRowBodyContents: function(record, data) {
                    return rowBodyTpl.applyTemplate(record.getData()) || this.expander.bodyContent[record.internalId];
                }
            }, {
                ftype: 'rowwrap',
                lockableScope: 'normal'
            }];
        if (grid.features) {
            grid.features = Ext.Array.push(features, grid.features);
        } else {
            grid.features = features;
        }
        this.componentsCache = [];
        this.outerComponentsCache = [];
        if (this.component && this.singleExpand === false) {
            this.componentCfg = this.component;
            delete this.component;
        }
        if (this.component && !this.component.initialConfig) {
            this.component.monitorResize = true;
            this.componentCfg = this.component;
            this.component = Ext.ComponentManager.create(Ext.isFunction(this.component) ? this.component.call({
                expander: this
            }) : this.component, "panel");
        }
    },
    getExpanded: function() {
        var store = this.grid.store,
            expandedRecords = [];
        store.each(function(record, index) {
            if (this.recordsExpanded[record.internalId]) {
                expandedRecords.push(record);
            }
        }, this);
        return expandedRecords;
    },
    init: function(grid) {
        var me = this,
            reconfigurable = grid,
            lockedView;
        this.callParent(arguments);
        this.grid = grid;
        me.view = grid.getView();
        this.addExpander();
        me.bindView(me.view);
        me.view.addRowTpl(me.addCollapsedCls).rowExpander = me;
        if (grid.ownerLockable) {
            reconfigurable = grid.ownerLockable;
            reconfigurable.syncRowHeight = false;
            lockedView = reconfigurable.lockedGrid.getView();
            me.bindView(lockedView);
            lockedView.addRowTpl(me.addCollapsedCls).rowExpander = me;
            reconfigurable.mon(reconfigurable, 'columnschanged', me.refreshRowHeights, me);
            reconfigurable.mon(reconfigurable.store, 'datachanged', me.refreshRowHeights, me);
        }
        reconfigurable.on('beforereconfigure', me.beforeReconfigure, me);
        if (grid.ownerLockable && !grid.rowLines) {
            me.view.on('rowfocus', me.refreshRowHeights, me);
        }
        grid.headerCt.on("columnresize", this.updateComponentsWidth, this, {
            delay: 20,
            buffer: 20
        });
        grid.headerCt.on("columnhide", this.updateComponentsWidth, this, {
            delay: 20,
            buffer: 20
        });
        grid.headerCt.on("columnshow", this.updateComponentsWidth, this, {
            delay: 20,
            buffer: 20
        });
    },
    updateComponentsWidth: function() {
        var i, grid = this.grid,
            body, len = this.componentsCache.length,
            item;
        if (this.component && this.component.record && this.recordsExpanded[this.component.record.internalId]) {
            body = Ext.get(grid.view.getNode(grid.store.getByInternalId(this.component.record.internalId))).parent().down("div.x-grid-rowbody");
            this.component.setWidth(body.getWidth() - (this.scrollOffset || 0));
        }
        if (this.componentsCache && len > 0) {
            for (i = 0; i < len; i++) {
                item = this.componentsCache[i];
                if (this.recordsExpanded[item.id]) {
                    body = Ext.get(grid.view.getNode(grid.store.getByInternalId(item.id))).parent().down("div.x-grid-rowbody");
                    item.cmp.setWidth(body.getWidth() - (this.scrollOffset || 0));
                }
            }
        }
    },
    beforeReconfigure: function(grid, store, columns, oldStore, oldColumns) {
        var expander = this.getHeaderConfig();
        expander.locked = true;
        if (columns) {
            columns.unshift(expander);
        }
    },
    addExpander: function() {
        var me = this,
            expanderGrid = me.grid,
            expanderHeader = me.getHeaderConfig();
        if (expanderGrid.ownerLockable) {
            expanderGrid = expanderGrid.ownerLockable.lockedGrid;
            expanderGrid.width += expanderHeader.width;
        }
        expanderGrid.headerCt.insert(0, expanderHeader);
    },
    getRowBodyFeatureData: function(record, idx, rowValues) {
        var me = this;
        me.self.prototype.setupRowData.apply(me, arguments);
        rowValues.rowBody = me.getRowBodyContents(record);
        rowValues.rowBodyCls = me.recordsExpanded[record.internalId] ? '' : me.rowBodyHiddenCls;
    },
    setup: function(rows, rowValues) {
        var me = this;
        me.self.prototype.setup.apply(me, arguments);
        if (!me.grid.ownerLockable && me.grid.selModel.selType != "checkboxmodel") {
            rowValues.rowBodyColspan -= 1;
        }
    },
    stopEventFn: function(view, e) {
        return !e.getTarget(".x-grid-rowbody", view.el);
    },
    bindView: function(view) {
        view.stopEventFn = this.stopEventFn;
        view.on("beforerefresh", function() {
            this.preventsExpanding = {};
        }, this);
        if (this.expandOnEnter) {
            view.on('itemkeydown', this.onKeyDown, this);
        }
        if (this.expandOnDblClick) {
            view.on('itemdblclick', this.onDblClick, this);
        }
        view.on('itemmousedown', function(view, record, item, index, e) {
            return !e.getTarget('div.x-grid-rowbody', view.el);
        }, this);
        if (this.swallowBodyEvents) {
            view.on("itemupdate", this.swallowRow, this);
            view.on("refresh", this.swallowRow, this);
        }
        if ((this.componentCfg && this.singleExpand === false) || this.loader) {
            view.on("beforerefresh", this.mayRemoveComponents, this);
            view.on("beforeitemupdate", this.mayRemoveComponent, this);
            view.on("beforeitemremove", this.removeComponent, this);
            view.on("refresh", this.restoreComponents, this);
            view.on("itemupdate", this.restoreSingleComponent, this);
        }
        if (this.component) {
            view.on("beforerefresh", this.moveComponent, this);
            view.on("beforeitemupdate", this.moveComponent, this);
            view.on("beforeitemremove", this.moveComponent, this);
            view.on("refresh", this.restoreComponent, this);
            view.on("itemupdate", this.restoreComponent, this);
        }
    },
    moveComponent: function() {
        if (!this.componentInsideGrid) {
            return;
        }
        var ce = this.component.getEl(),
            el = Ext.net.ResourceMgr.getAspForm() || Ext.getBody();
        ce.addCls("x-hidden");
        el.dom.appendChild(ce.dom);
        this.componentInsideGrid = false;
    },
    removeComponent: function(view, record, rowIndex) {
        for (var i = 0, l = this.componentsCache.length; i < l; i++) {
            if (this.componentsCache[i].id == record.internalId) {
                try {
                    var cmp = this.componentsCache[i].cmp;
                    cmp.destroy();
                    Ext.Array.remove(this.componentsCache, this.componentsCache[i]);
                } catch (ex) {}
                break;
            }
        }
    },
    mayRemoveComponent: function(view, record, rowIndex) {
        if (this.invalidateComponentsOnRefresh) {
            this.removeComponents(view, record, rowIndex);
            return;
        }
        var item, ce, elTo;
        for (var i = 0, l = this.componentsCache.length; i < l; i++) {
            item = this.componentsCache[i];
            if (item.id == record.internalId) {
                ce = item.cmp.getEl();
                elTo = Ext.net.ResourceMgr.getAspForm() || Ext.getBody();
                ce.addCls("x-hidden");
                elTo.dom.appendChild(ce.dom);
                this.outerComponentsCache.push(item);
                Ext.Array.remove(this.componentsCache, item);
                break;
            }
        }
    },
    mayRemoveComponents: function() {
        if (this.invalidateComponentsOnRefresh) {
            this.removeComponents();
            return;
        }
        var cmp, ce, elTo = Ext.net.ResourceMgr.getAspForm() || Ext.getBody();
        for (var i = 0, l = this.componentsCache.length; i < l; i++) {
            cmp = this.componentsCache[i].cmp;
            ce = cmp.getEl();
            ce.addCls("x-hidden");
            elTo.dom.appendChild(ce.dom);
        }
        this.outerComponentsCache = this.componentsCache;
        this.componentsCache = [];
    },
    removeComponents: function(outer) {
        for (var i = 0, l = this.componentsCache.length; i < l; i++) {
            try {
                var cmp = this.componentsCache[i].cmp;
                cmp.destroy();
            } catch (ex) {}
        }
        this.componentsCache = [];
        if (outer && this.outerComponentsCache) {
            for (var i = 0, l = this.outerComponentsCache.length; i < l; i++) {
                try {
                    var cmp = this.outerComponentsCache[i].cmp;
                    cmp.destroy();
                } catch (ex) {}
            }
            this.outerComponentsCache = [];
        }
    },
    restoreComponent: function() {
        if (this.component.rendered === false) {
            return;
        }
        var grid = this.grid;
        Ext.each(grid.getView().getViewRange(), function(record, i) {
            if (record.isCollapsedPlaceholder) {
                return;
            }
            if (this.recordsExpanded[record.internalId]) {
                var rowNode = grid.view.getNode(record, false),
                    row = Ext.get(rowNode),
                    nextBd = row.down(this.rowBodyTrSelector),
                    body = row.down("div.x-grid-rowbody"),
                    rowCmp = this.getComponent(record, body);
                body.appendChild(this.component.getEl());
                this.component.removeCls("x-hidden");
                this.component.setWidth(body.getWidth() - (this.scrollOffset || 0));
                this.componentInsideGrid = true;
                return false;
            }
        }, this);
        if (grid.ownerLockable) {
            this.doRefreshRowHeights();
        } else {
            grid.view.refreshSize();
        }
        if (this.component.doLayout) {
            this.component.doLayout();
        } else {
            this.component.doComponentLayout();
        }
    },
    onRowCmpLoad: function(loader, response, options) {
        var expander = loader.paramsFnScope.expander,
            grid = expander.grid,
            target = loader.getTarget();
        if (grid.ownerLockable) {
            expander.refreshRowHeights();
        } else {
            grid.view.refreshSize();
        }
        target.doLayout ? target.doLayout() : target.doComponentLayout();
    },
    createComponent: function(record, body) {
        var rowCmp, needContainer, scope, box, loader;
        if (this.loader) {
            needContainer = !(this.loader.renderer == "html" || this.loader.renderer == "data");
            scope = {
                record: record,
                expander: this,
                el: body,
                grid: this.grid
            };
            loader = Ext.isFunction(this.loader) ? this.loader.call(scope) : Ext.clone(this.loader);
            loader.paramsFnScope = scope;
            loader.success = this.onRowCmpLoad;
            rowCmp = Ext.create(needContainer ? "Ext.container.Container" : "Ext.Component", {
                loader: loader,
                layout: "anchor",
                defaults: {
                    anchor: "100%"
                },
                tpl: !Ext.isEmpty(this.cmpBodyTpl) ? ((this.cmpBodyTpl instanceof Ext.XTemplate) ? this.cmpBodyTpl : Ext.create('Ext.XTemplate', this.cmpBodyTpl)) : undefined
            });
        } else {
            rowCmp = Ext.ComponentManager.create(Ext.isFunction(this.componentCfg) ? this.componentCfg.call({
                record: record,
                expander: this
            }) : Ext.clone(this.componentCfg), "panel");
        }
        if (this.componentMargin) {
            rowCmp.margin = this.componentMargin;
        }
        rowCmp.ownerCt = this.grid;
        rowCmp.record = record;
        rowCmp.width = body.getWidth() - (this.scrollOffset || 0);
        rowCmp.render(body);
        rowCmp.addCls("x-row-expander-control");
        this.componentsCache.push({
            id: record.internalId,
            cmp: rowCmp
        });
        return rowCmp;
    },
    restoreSingleComponent: function(record, index, node) {
        var grid = this.grid;
        if (record.isCollapsedPlaceholder) {
            return;
        }
        if (this.recordsExpanded[record.internalId]) {
            var rowNode = grid.view.getNode(record, false),
                row = Ext.get(rowNode),
                nextBd = row.down(this.rowBodyTrSelector),
                body = row.down("div.x-grid-rowbody"),
                rowCmp = this.getComponent(record, body);
            if (!rowCmp) {
                rowCmp = this.createComponent(record, body);
            }
            if (grid.ownerLockable) {
                this.refreshRowHeights();
            } else {
                grid.view.refreshSize();
            }
            rowCmp.doLayout ? rowCmp.doLayout() : rowCmp.doComponentLayout();
        }
    },
    restoreComponents: function() {
        var grid = this.grid,
            cmps = [];
        Ext.each(grid.getView().getViewRange(), function(record, i) {
            if (record.isCollapsedPlaceholder) {
                return;
            }
            if (this.recordsExpanded[record.internalId]) {
                var rowNode = grid.view.getNode(record, false),
                    row = Ext.get(rowNode),
                    nextBd = row.down(this.rowBodyTrSelector),
                    body = row.down("div.x-grid-rowbody"),
                    rowCmp = this.getComponent(record, body);
                if (!rowCmp) {
                    rowCmp = this.createComponent(record, body);
                }
                cmps.push(rowCmp);
            }
        }, this);
        this.removeOuterOrphans();
        if (grid.view.viewReady) {
            if (grid.ownerLockable) {
                this.refreshRowHeights();
            } else {
                grid.view.refreshSize();
            }
        }
        Ext.each(cmps, function(cmp) {
            cmp.doLayout ? cmp.doLayout() : cmp.doComponentLayout();
        });
    },
    removeOuterOrphans: function() {
        if (this.outerComponentsCache && this.outerComponentsCache.length > 0) {
            var len = this.outerComponentsCache.length,
                store = this.grid.store,
                records = store.data.items,
                len2 = records.length,
                r, found, i = 0,
                item;
            while (i < len) {
                item = this.outerComponentsCache[i];
                found = false;
                for (r = 0; r < len2; r++) {
                    if (records[r].internalId == item.id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    try {
                        item.cmp.destroy();
                    } catch (ex) {}
                    Ext.Array.remove(this.outerComponentsCache, item);
                    len--;
                } else {
                    i++;
                }
            }
        }
    },
    swallowRow: function() {
        var grid = this.grid;
        grid.store.each(function(record, i) {
            if (this.recordsExpanded[record.internalId]) {
                var rowNode = grid.view.getNode(record, false),
                    body = Ext.get(rowNode).down(this.rowBodyTrSelector);
                body.swallowEvent(['click', 'mousedown', 'mousemove', 'mouseup', 'dblclick'], false);
            }
        }, this);
    },
    onKeyDown: function(view, record, row, rowIdx, e) {
        if (e.getKey() == e.ENTER) {
            var ds = view.store,
                sels = view.getSelectionModel().getSelection(),
                ln = sels.length,
                i = 0;
            for (; i < ln; i++) {
                if (!this.preventsExpanding[sels[i].internalId]) {
                    rowIdx = ds.indexOf(sels[i]);
                    this.toggleRow(rowIdx, sels[i]);
                }
            }
        }
    },
    beforeExpand: function(record, body, rowNode, rowIndex) {
        if (this.fireEvent("beforeexpand", this, record, body, rowNode, rowIndex) !== false) {
            if (this.singleExpand || this.component) {
                this.collapseAll();
            }
            return true;
        } else {
            return false;
        }
    },
    expandAll: function() {
        if (this.singleExpand || this.component) {
            return;
        }
        var i = 0,
            records = this.view.getViewRange(),
            store = this.grid.store,
            len = records.length;
        for (i; i < len; i++) {
            this.toggleRow(store.indexOf(records[i]), records[i], true);
        }
    },
    collapseAll: function() {
        var i = 0,
            records = this.view.getViewRange(),
            store = this.grid.store,
            len = records.length;
        for (i; i < len; i++) {
            this.toggleRow(store.indexOf(records[i]), records[i], false);
        }
        this.recordsExpanded = {};
        this.grid.view.rowBodyFeature.recordsExpanded = this.recordsExpanded;
    },
    collapseRow: function(row) {
        this.toggleRow(row, this.view.getRecord(this.view.getNode(row)), false);
    },
    expandRow: function(row) {
        this.toggleRow(row, this.view.getRecord(this.view.getNode(row)), true);
    },
    toggleRow: function(rowIdx, record, state) {
        if (record.isCollapsedPlaceholder) {
            return;
        }
        var me = this,
            view = this.view,
            rowNode = this.view.getNode(record, false),
            row = Ext.get(rowNode),
            nextBd = row.down(this.rowBodyTrSelector),
            body = row.down("div.x-grid-rowbody"),
            hasState = Ext.isDefined(state),
            isCollapsed = row.hasCls(me.rowCollapsedCls),
            addOrRemoveCls = isCollapsed ? 'removeCls' : 'addCls',
            grid = this.grid,
            rowCmp, needContainer, ownerLock, rowHeight, fireView;
        rowIdx = grid.store.indexOf(record);
        if ((row.hasCls(this.rowCollapsedCls) && !hasState) || (hasState && state === true && row.hasCls(this.rowCollapsedCls))) {
            if (this.beforeExpand(record, nextBd, rowNode, rowIdx)) {
                row.removeCls(this.rowCollapsedCls);
                nextBd.removeCls(this.rowBodyHiddenCls);
                this.recordsExpanded[record.internalId] = true;
                if (this.component) {
                    if (this.recreateComponent) {
                        this.component.destroy();
                        this.component = Ext.ComponentManager.create(Ext.isFunction(this.componentCfg) ? this.componentCfg.call({
                            record: record,
                            expander: this
                        }) : this.componentCfg, "panel");
                    }
                    if (this.component.rendered) {
                        body.appendChild(this.component.getEl());
                        this.component.show();
                        this.component.setWidth(body.getWidth() - (this.scrollOffset || 0));
                    } else {
                        this.component.width = body.getWidth() - (this.scrollOffset || 0);
                        this.component.render(body);
                    }
                    this.component.addCls("x-row-expander-control");
                    this.component.removeCls("x-hidden");
                    this.componentInsideGrid = true;
                    rowCmp = this.component;
                } else if (this.componentCfg || this.loader) {
                    rowCmp = this.getComponent(record, body);
                    if (!rowCmp) {
                        rowCmp = this.createComponent(record, body);
                    } else {
                        rowCmp.show();
                    }
                }
                if (this.swallowBodyEvents) {
                    this.swallowRow();
                }
                view.refreshSize();
                if (rowCmp) {
                    rowCmp.record = record;
                    rowCmp.doLayout ? rowCmp.doLayout() : rowCmp.doComponentLayout();
                }
                this.fireEvent('expand', this, record, nextBd, rowNode, rowIdx);
            }
        } else if ((!row.hasCls(this.rowCollapsedCls) && !hasState) || (hasState && state === false && !row.hasCls(this.rowCollapsedCls))) {
            if (this.fireEvent("beforecollapse", this, record, nextBd, rowNode, rowIdx) !== false) {
                if (this.component && this.component.rendered) {
                    this.component.hide();
                } else if (this.componentCfg || this.loader) {
                    rowCmp = this.getComponent(record, body);
                    if (rowCmp && rowCmp.rendered) {
                        rowCmp.hide();
                    }
                }
                row.addCls(this.rowCollapsedCls);
                nextBd.addCls(this.rowBodyHiddenCls);
                this.recordsExpanded[record.internalId] = false;
                view.refreshSize();
                this.fireEvent('collapse', this, record, nextBd, rowNode, rowIdx);
            }
        }
        if (me.grid.ownerLockable) {
            ownerLock = me.grid.ownerLockable;
            fireView = ownerLock.getView();
            view = ownerLock.lockedGrid.view;
            rowHeight = row.getHeight();
            row = Ext.fly(view.getNode(record, false), '_rowExpander');
            row.setHeight(rowHeight);
            row[addOrRemoveCls](me.rowCollapsedCls);
            view.refreshSize();
        }
    },
    onDblClick: function(view, record, row, rowIdx, e) {
        if (!this.preventsExpanding[record.internalId] && !e.getTarget(this.rowBodyTrSelector, view.el)) {
            this.toggleRow(rowIdx, record);
        }
    },
    renderer: Ext.emptyFn,
    refreshRowHeights: function() {
        Ext.globalEvents.on({
            idle: this.doRefreshRowHeights,
            scope: this,
            single: true
        });
    },
    doRefreshRowHeights: function() {
        var me = this,
            recordsExpanded = me.recordsExpanded,
            key, record, lockedView = me.grid.ownerLockable.lockedGrid.view,
            normalView = me.grid.ownerLockable.normalGrid.view,
            normalRow, lockedRow, lockedHeight, normalHeight;
        for (key in recordsExpanded) {
            if (recordsExpanded.hasOwnProperty(key)) {
                record = this.view.store.data.get(key);
                lockedRow = lockedView.getNode(record, false);
                normalRow = normalView.getNode(record, false);
                lockedRow.style.height = normalRow.style.height = '';
                lockedHeight = lockedRow.offsetHeight;
                normalHeight = normalRow.offsetHeight;
                if (normalHeight > lockedHeight) {
                    lockedRow.style.height = normalHeight + 'px';
                } else if (lockedHeight > normalHeight) {
                    normalRow.style.height = lockedHeight + 'px';
                }
            }
        }
    },
    getHeaderConfig: function() {
        var me = this;
        return {
            width: 24,
            isExpanderColumn: true,
            lockable: false,
            sortable: false,
            resizable: false,
            draggable: false,
            hideable: false,
            menuDisabled: true,
            hidden: this.hiddenColumn,
            tdCls: Ext.baseCSSPrefix + 'grid-cell-special',
            innerCls: Ext.baseCSSPrefix + 'grid-cell-inner-row-expander',
            preinitScope: me,
            preinitFn: function(column) {
                this.expanderColumn = column;
            },
            renderer: function(value, metadata, record) {
                if (!me.grid.ownerLockable) {
                    metadata.tdAttr += ' rowspan="2"';
                }
                var res = me.renderer.apply(this, arguments);
                if (res === false) {
                    res = "&#160;";
                    me.preventsExpanding[record.internalId] = true;
                } else if (res === true) {
                    res = null;
                }
                return res ? res : ('<div class="' + Ext.baseCSSPrefix + 'grid-row-expander"></div>');
            },
            processEvent: function(type, view, cell, rowIndex, cellIndex, e, record) {
                if (type == "mousedown" && e.getTarget('.x-grid-row-expander')) {
                    me.toggleRow(rowIndex, record);
                    return me.selectRowOnExpand;
                }
            }
        };
    },
    isCollapsed: function(row) {
        if (typeof row === "number") {
            row = this.view.getNode(row);
        }
        return Ext.fly(row).hasCls(this.rowCollapsedCls);
    },
    isExpanded: function(row) {
        if (typeof row === "number") {
            row = this.view.getNode(row);
        }
        return !Ext.fly(row).hasCls(this.rowCollapsedCls);
    },
    getComponent: function(record, body) {
        var i, l, item, cmp;
        if (this.componentsCache) {
            for (i = 0, l = this.componentsCache.length; i < l; i++) {
                item = this.componentsCache[i];
                if (item.id == record.internalId) {
                    if (body) {
                        item.cmp.setWidth(body.getWidth() - (this.scrollOffset || 0));
                    }
                    return item.cmp;
                }
            }
        }
        if (this.outerComponentsCache) {
            for (i = 0, l = this.outerComponentsCache.length; i < l; i++) {
                if (this.outerComponentsCache[i].id == record.internalId) {
                    item = this.outerComponentsCache[i];
                    cmp = item.cmp;
                    if (body) {
                        body.appendChild(cmp.getEl());
                        cmp.removeCls("x-hidden");
                        cmp.setWidth(body.getWidth() - (this.scrollOffset || 0));
                        Ext.Array.remove(this.outerComponentsCache, item);
                        this.componentsCache.push(item);
                    }
                    return cmp;
                }
            }
        }
        return null;
    },
    destroy: function() {
        if (this.component && Ext.isFunction(this.component.destroy)) {
            this.component.destroy();
        }
        if (this.componentsCache) {
            this.removeComponents(true);
        }
    }
});

Ext.grid.feature.AbstractSummary.override({
    generateSummaryData: function() {
        var oldData, result, store = this.view.store;
        if (store.buffered && store.pageMap && store.pageMap.hasPage(1)) {
            oldData = store.data;
            store.data = new Ext.util.MixedCollection(false, Ext.data.Store.recordIdFn);
            store.data.addAll(store.pageMap.getPage(1));
        }
        result = this.callOverridden(arguments);
        if (store.buffered && oldData) {
            store.data = oldData;
        }
        return result;
    }
});

Ext.grid.feature.Grouping.override({
    init: function(grid) {
        this.callParent();
        grid.groupingFeature = this;
    },
    aggregate: function(fn, scope, grouped, args) {
        args = args || [];
        if (grouped && this.isGrouped()) {
            var groups = this._groupingSummaryPlugin.summaryGroups,
                i, len = groups.length,
                out = {},
                group, records = this.pageMap.getPage(1),
                recLength = records.length,
                record, groupStr, pointers = {};
            for (i = 0; i < len; ++i) {
                group = groups[i];
                pointers[group.name] = {
                    name: group.name,
                    children: []
                };
            }
            for (i = 0; i < recLength; i++) {
                record = records[i];
                groupStr = this.getGroupString(record);
                group = pointers[groupStr];
                if (group) {
                    group.children.push(record);
                }
            }
            for (i = 0; i < len; ++i) {
                group = groups[i];
                out[group.name] = fn.apply(scope || this, [pointers[group.name].children].concat(args));
            }
            return out;
        } else {
            return fn.apply(scope || this, [this.data.items].concat(args));
        }
    },
    generateSummaryData: function() {
        var oldData, oldAggregate, result, store = this.view.store;
        if (store.buffered && store.pageMap && store.pageMap.hasPage(1)) {
            if (store.isGrouped()) {
                oldAggregate = store.aggregate;
                store.aggregate = this.aggregate;
                store._groupingSummaryPlugin = this;
            } else {
                oldData = store.data;
                store.data = new Ext.util.MixedCollection(false, Ext.data.Store.recordIdFn);
                store.data.addAll(store.pageMap.getPage(1));
            }
        }
        result = this.callOverridden(arguments);
        if (store.buffered && oldData) {
            store.data = oldData;
        }
        if (store.buffered && oldAggregate) {
            store.aggregate = oldAggregate;
            delete store._groupingSummaryPlugin;
        }
        return result;
    }
});

Ext.grid.property.Grid.override({
    editable: true,
    getDataField: function() {
        if (!this.dataField) {
            this.dataField = new Ext.form.Hidden({
                name: this.id
            });
            this.on("beforedestroy", function() {
                this.dataField.destroy();
            }, this);
        }
        return this.dataField;
    },
    getChangeField: function() {
        if (!this.changeField) {
            this.changeField = new Ext.form.Hidden({
                name: this.id + "_changeMap"
            });
            this.on("beforedestroy", function() {
                this.changeField.destroy();
            }, this);
        }
        return this.changeField;
    },
    initComponent: function() {
        this.changeMap = {};
        this.originalMap = {};
        this.callParent(arguments);
        this.propertyNames = this.propertyNames || [];
        if (!this.editable) {
            this.on("beforeedit", function() {
                return false;
            });
        }
        this.on("propertychange", this.onPropertyChangeHandler);
    },
    onPropertyChangeHandler: function(source, recordId, value, oldValue) {
        if (Ext.isDefined(this.changeMap[recordId])) {
            if (Ext.isDate(value) && Ext.isDate(this.originalMap[recordId])) {
                value = Ext.Date.clearTime(value, true);
                if (this.originalMap[recordId].getTime() === value.getTime()) {
                    delete this.changeMap[recordId];
                }
            } else if (this.originalMap[recordId] === value) {
                delete this.changeMap[recordId];
            }
        } else {
            if (Ext.isDate(value) && !Ext.isDate(oldValue)) {
                var editor = this.getConfig(recordId, 'editor');
                if (editor && editor.field) {
                    oldValue = Ext.Date.parse(oldValue, editor.field.format);
                }
            }
            this.originalMap[recordId] = oldValue;
            this.changeMap[recordId] = true;
        }
        this.saveSource(source);
    },
    afterRender: function() {
        this.callParent(arguments);
        if (this.hasId()) {
            this.getDataField().render(this.el.parent() || this.el);
            this.getChangeField().render(this.el.parent() || this.el);
        }
    },
    saveSource: function(source) {
        if (this.hasId()) {
            this.getDataField().setValue(Ext.encode(source || this.propStore.getSource()));
            this.getChangeField().setValue(Ext.encode(this.changeMap));
        }
    },
    setProperty: function(prop, value, create) {
        this.callParent(arguments);
        if (create) {
            this.saveSource();
        }
    },
    removeProperty: function(prop) {
        this.callParent(arguments);
        this.saveSource();
    }
});

Ext.tree.Panel.override({
    mode: "local",
    selectionSubmit: false,
    constructor: function(config) {
        if (config && config.autoLoad) {
            delete config.autoLoad;
        }
        this.callParent(arguments);
    },
    initSelectionSubmit: function() {
        this.plugins = this.plugins || [];
        this.plugins.push(Ext.create('Ext.grid.plugin.SelectionSubmit', {}));
    },
    doSelection: function() {
        this.getSelectionSubmit().doSelection();
    },
    initSelectionData: function() {
        this.getSelectionSubmit().initSelectionData();
    },
    initComponent: function() {
        this.addEvents({
            "submit": true,
            "submitexception": true,
            "beforeremoteaction": true,
            "remoteactionexception": true,
            "remoteactionrefusal": true,
            "remoteactionsuccess": true,
            "beforeremotemove": true,
            "beforeremoterename": true,
            "beforeremoteremove": true,
            "beforeremoteinsert": true,
            "beforeremoteappend": true
        });
        this.initSelectionSubmit();
        this.callParent(arguments);
        this.relayEvents(this.getView(), ["nodedragover"]);
        if ((Ext.isEmpty(this.selectionSubmitConfig) || this.selectionSubmitConfig.disableAutomaticSubmit !== true) && this.hasId()) {
            this.getSelectionModel().on("selectionchange", this.updateSelection, this);
            this.on("checkchange", this.updateCheckSelection, this);
            this.on("load", this.updateCheckSelection, this);
            this.on("itemappend", this.updateCheckSelection, this);
            this.on("iteminsert", this.updateCheckSelection, this);
            this.on("afterrender", this.updateCheckSelection, this, {
                single: true
            });
        }
        if (this.noLeafIcon) {
            this.addCls("x-noleaf-icon");
        }
        if (this.mode === "remote") {
            this.mode = "local";
            this.on("afterrender", function() {
                this.setMode("remote");
            }, this, {
                single: true
            });
        }
    },
    expandAll: function(callback, scope) {
        if (Ext.isBoolean(callback)) {
            this.getView().animate = callback;
            this.callParent();
            this.getView().animate = this.enableAnimations;
        } else {
            this.callParent(arguments);
        }
    },
    collapseAll: function(callback, scope) {
        if (Ext.isBoolean(callback)) {
            this.getView().animate = callback;
            this.callParent();
            this.getView().animate = this.enableAnimations;
        } else {
            this.callParent(arguments);
        }
    },
    setChecked: function(cfg) {
        cfg = cfg || {};
        var originFn = this.updateCheckSelection;
        this.updateCheckSelection = Ext.emptyFn;
        if (cfg.silent) {
            this.suspendEvents();
        }
        if (cfg.keepExisting !== true) {
            this.clearChecked();
        }
        cfg.value = Ext.isDefined(cfg.value) ? cfg.value : true;
        if (cfg.ids) {
            for (var i = 0, l = cfg.ids.length; i < l; i++) {
                var node = this.store.getNodeById(cfg.ids[i]);
                node.set('checked', cfg.value);
                this.fireEvent('checkchange', node, cfg.value);
            }
        }
        if (cfg.nodes) {
            for (var i = 0, l = cfg.nodes.length; i < l; i++) {
                var node = cfg.nodes[i];
                node.set('checked', cfg.value);
                this.fireEvent('checkchange', node, cfg.value);
            }
        }
        this.updateCheckSelection = originFn;
        this.updateCheckSelection();
        if (cfg.silent) {
            this.resumeEvents();
        }
    },
    toggleChecked: function(startNode, value) {
        startNode = startNode || this.getRootNode();
        var f = function(node) {
            var oldValue = node.get("checked");
            if (Ext.isBoolean(oldValue) && oldValue !== value) {
                node.set('checked', value);
                this.fireEvent('checkchange', node, value);
            }
        };
        var originFn = this.updateCheckSelection;
        this.updateCheckSelection = Ext.emptyFn;
        startNode.cascadeBy(f, this);
        this.updateCheckSelection = originFn;
        this.updateCheckSelection();
    },
    clearChecked: function(startNode) {
        this.toggleChecked(startNode, false);
    },
    setAllChecked: function(startNode) {
        this.toggleChecked(startNode, true);
    },
    filterGetRowClass: function(record) {
        var cls = "";
        if (this._originGetRowClass && this._originGetRowClass.fn) {
            cls = this._originGetRowClass.fn.apply(arguments) || "";
        }
        return record.data.hidden ? "x-hidden " + cls : cls;
    },
    filterBy: function(fn, config) {
        config = config || {};
        this.filtered = this.filtered || {};
        var startNode = config.startNode || this.getRootNode(),
            af, origAnimate = this.getView().animate;
        this.getView().animate = false;
        Ext.suspendLayouts();
        if (!this._originGetRowClass) {
            this._originGetRowClass = {
                fn: this.view.getRowClass
            };
            this.view.getRowClass = Ext.Function.bind(this.filterGetRowClass, this);
        }
        if (config.autoClear) {
            this.clearFilter(false, false);
        }
        af = this.filtered;
        var f = function(n) {
            if (n === startNode) {
                return true;
            }
            if (af[n.getId() || n.internalId]) {
                return false;
            }
            var m = fn.call(config.scope || n, n),
                viewNode = this.getView().getNode(n);
            if (!m) {
                af[n.getId() || n.internalId] = n;
                n.data.hidden = true;
                if (viewNode) {
                    Ext.fly(viewNode).addCls("x-hidden");
                }
            } else {
                if (n.data.hidden && viewNode) {
                    Ext.fly(viewNode).removeCls("x-hidden");
                }
                n.data.hidden = false;
                n.bubble(function(p) {
                    if ((p.getId() || p.internalId) === (this.getRootNode().getId() || this.getRootNode().internalId)) {
                        return false;
                    }
                    delete af[p.getId() || p.internalId];
                    if (p.data.hidden) {
                        var pViewNode = this.getView().getNode(p);
                        if (pViewNode) {
                            Ext.fly(pViewNode).removeCls("x-hidden");
                        }
                    }
                    p.data.hidden = false;
                }, this);
            }
            return true;
        };
        startNode.cascadeBy(f, this);
        if (config.expandNodes !== false) {
            startNode.expand(true);
        }
        this.getView().animate = origAnimate;
        if (config.remove) {
            for (var id in af) {
                if (typeof id != "function") {
                    var n = af[id];
                    if (n && n.parentNode) {
                        n.parentNode.removeChild(n);
                    }
                }
            }
        }
        Ext.resumeLayouts();
    },
    clearFilter: function(collapse, suspendLayouts) {
        var af = this.filtered || {},
            n, viewNode;
        if (suspendLayouts !== false) {
            Ext.suspendLayouts();
        }
        if (this._originGetRowClass) {
            this.view.getRowClass = this._originGetRowClass.fn;
            delete this._originGetRowClass;
        }
        for (var id in af) {
            if (typeof id != "function") {
                n = af[id];
                if (n) {
                    n.data.hidden = false;
                    viewNode = this.getView().getNode(n);
                    if (viewNode) {
                        Ext.fly(viewNode).removeCls("x-hidden");
                    }
                }
            }
        }
        this.filtered = {};
        if (collapse) {
            var animate = this.getView().animate;
            this.getView().animate = false;
            this.getRootNode().collapseChildren(true);
            this.getView().animate = animate;
        }
        if (suspendLayouts !== false) {
            Ext.resumeLayouts();
        }
        if (Ext.isWebKit) {
            this.getView().refresh();
        }
    },
    afterRender: function() {
        this.callParent(arguments);
        if ((Ext.isEmpty(this.selectionSubmitConfig) || this.selectionSubmitConfig.disableAutomaticSubmit !== true) && this.hasId()) {
            this.getSelectionModelField().render(this.el.parent() || this.el);
            this.getCheckNodesField().render(this.el.parent() || this.el);
        }
    },
    getSelectionModelField: function() {
        if (!this.selectionModelField) {
            this.selectionModelField = new Ext.form.field.Hidden({
                name: this.selectedHiddenName || (this.id + "_SM")
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.selectionModelField);
        }
        return this.selectionModelField;
    },
    getCheckNodesField: function() {
        if (!this.checkNodesField) {
            this.checkNodesField = new Ext.form.field.Hidden({
                name: this.checkedHiddenName || (this.id + "_CheckNodes")
            });
            this.on("beforedestroy", function() {
                this.destroy();
            }, this.checkNodesField);
        }
        return this.checkNodesField;
    },
    excludeAttributes: ["parentId", "index", "leaf", "depth", "expanded", "expandable", "cls", "icon", "iconCls", "root", "isLast", "isFirst", "allowDrag", "allowDrop", "loaded", "loading", "href", "hrefTarget", "qtip", "qtitle", "children", "dataPath", "selected", "hidden"],
    defaultAttributeFilter: function(attrName, attrValue) {
        return typeof attrValue != "function" && Ext.Array.indexOf(this.excludeAttributes, attrName) == -1;
    },
    defaultNodeFilter: function(node) {
        return true;
    },
    serializeTree: function(config) {
        config = config || {};
        if (Ext.isEmpty(config.withChildren)) {
            config.withChildren = true;
        }
        return Ext.encode(this.convertToSubmitNode(this.getRootNode(), config));
    },
    convertToSubmitNode: function(node, config) {
        config = config || {};
        if (!config.prepared) {
            config.attributeFilter = config.attributeFilter || Ext.Function.bind(this.defaultAttributeFilter, this);
            config.nodeFilter = config.nodeFilter || Ext.Function.bind(this.defaultNodeFilter, this);
            config.prepared = true;
        }
        if (!config.nodeFilter(node)) {
            return;
        }
        var sNode = {},
            path = node.getPath(config.pathAttribute),
            deleteAttrs = true;
        if (config.attributeFilter(node.idProperty, node.getId())) {
            sNode.nodeID = node.getId();
        }
        if (config.attributeFilter(node.clientIdProperty, node.internalId)) {
            sNode.clientID = node.internalId;
        }
        if (config.attributeFilter(this.displayField, node.data[this.displayField])) {
            sNode.text = config.encode ? Ext.util.Format.htmlEncode(node.data[this.displayField]) : node.data[this.displayField];
        }
        if (config.attributeFilter("path", path)) {
            sNode.path = path;
        }
        sNode.attributes = {};
        for (var attr in node.data) {
            if (attr == node.idProperty || attr == this.displayField) {
                continue;
            }
            var attrValue = node.data[attr];
            if (config.attributeFilter(attr, attrValue)) {
                sNode.attributes[attr] = attrValue;
                deleteAttrs = false;
            }
        }
        if (deleteAttrs) {
            delete sNode.attributes;
        }
        if (config.withChildren) {
            var children = node.childNodes;
            if (children.length !== 0) {
                sNode.children = [];
                for (var i = 0; i < children.length; i++) {
                    var cNode = this.convertToSubmitNode(children[i], config);
                    if (!Ext.isEmpty(cNode)) {
                        sNode.children.push(cNode);
                    }
                }
                if (sNode.children.length === 0) {
                    delete sNode.children;
                }
            }
        }
        return sNode;
    },
    getSelectedNodes: function(config) {
        var selection = this.getSelectionModel().getSelection(),
            selNodes = [];
        if (!selection || selection.length == 0) {
            return [];
        }
        Ext.each(selection, function(node) {
            selNodes.push(this.convertToSubmitNode(node, config));
        }, this);
        return selNodes;
    },
    getChecked: function() {
        var view = this.getView();
        if (view.lockedView) {
            view = view.lockedView;
        }
        return view.getChecked();
    },
    getCheckedNodes: function(config) {
        var checkedNodes = this.getChecked();
        if (Ext.isEmpty(checkedNodes)) {
            return [];
        }
        var nodes = [];
        Ext.each(checkedNodes, function(node) {
            nodes.push(this.convertToSubmitNode(node, config));
        }, this);
        return nodes;
    },
    updateSelection: function() {
        this.selectionSubmitConfig = this.selectionSubmitConfig || {};
        if (Ext.isEmpty(this.selectionSubmitConfig.withChildren)) {
            this.selectionSubmitConfig.withChildren = false;
        }
        var selection = this.getSelectedNodes(this.selectionSubmitConfig);
        if (!Ext.isEmpty(selection)) {
            this.getSelectionModelField().setValue(Ext.encode(selection));
        } else {
            this.getSelectionModelField().setValue("");
        }
    },
    updateCheckSelection: function() {
        this.selectionSubmitConfig = this.selectionSubmitConfig || {};
        if (Ext.isEmpty(this.selectionSubmitConfig.withChildren)) {
            this.selectionSubmitConfig.withChildren = false;
        }
        var selection = this.getCheckedNodes(this.selectionSubmitConfig);
        if (!Ext.isEmpty(selection)) {
            this.getCheckNodesField().setValue(Ext.encode(selection));
        } else {
            this.getCheckNodesField().setValue("");
        }
    },
    submitNodes: function(config) {
        var nodes = this.serializeTree(config),
            ac = Ext.apply(this.directEventConfig || {}, config);
        if (ac.params) {
            ac.extraParams = ac.params;
            delete ac.params;
        }
        if (ac.callback) {
            ac.userCallback = ac.callback;
            delete ac.callback;
        }
        if (ac.scope) {
            ac.userScope = ac.scope;
            delete ac.scope;
        }
        if (this.submitUrl && !ac.url) {
            ac.url = this.submitUrl;
        }
        Ext.apply(ac, {
            control: this,
            eventType: "postback",
            action: "submit",
            serviceParams: nodes,
            userSuccess: this.submitSuccess,
            userFailure: this.submitFailure
        });
        if (ac.cleanRequest || ac.url) {
            ac.extraParams = ac.extraParams || {};
            ac.extraParams.data = ac.serviceParams;
            delete ac.serviceParams;
        }
        Ext.net.DirectEvent.request(ac);
    },
    submitFailure: function(response, result, context, type, action, extraParams, o) {
        var msg = {
            message: result.errorMessage || response.statusText
        };
        if (o && o.userCallback) {
            o.userCallback.call(o.userScope || context, o, false, response);
        }
        if (!context.hasListener("submitexception")) {
            if (o.showWarningOnFailure !== false && o.cancelFailureWarning !== true) {
                Ext.net.DirectEvent.showFailure(response, msg.message);
            }
        }
        context.fireEvent("submitexception", context, o, response, msg);
    },
    submitSuccess: function(response, result, context, type, action, extraParams, o) {
        try {
            var responseObj = result.serviceResponse || result;
            result = {
                success: responseObj.success,
                msg: responseObj.message
            };
        } catch (e) {
            if (o && o.userCallback) {
                o.userCallback.call(o.userScope || context, o, false, response);
            }
            if (Ext.net.DirectEvent.fireEvent("ajaxrequestexception", {}, {
                    "errorMessage": e.message
                }, null, null, null, null, o) !== false) {
                if (!context.hasListener("submitexception")) {
                    if (o.showWarningOnFailure !== false) {
                        Ext.net.DirectEvent.showFailure(response, e.message);
                    }
                }
            }
            context.fireEvent("submitexception", context, o, response, e);
            return;
        }
        if (result.success === false) {
            if (o && o.userCallback) {
                o.userCallback.call(o.userScope || context, o, false, response);
            }
            if (Ext.net.DirectEvent.fireEvent("ajaxrequestexception", {}, {
                    "errorMessage": result.msg
                }, null, null, null, null, o) !== false) {
                if (!context.hasListener("submitexception")) {
                    if (o.showWarningOnFailure !== false) {
                        Ext.net.DirectEvent.showFailure(response, result.msg);
                    }
                }
            }
            context.fireEvent("submitexception", context, o, response, {
                message: result.msg
            });
            return;
        }
        if (o && o.userCallback) {
            o.userCallback.call(o.userScope || context, o, true, response);
        }
        context.fireEvent("submit", context, o);
    },
    setMode: function(mode) {
        if (mode === "remote" && this.mode === "local") {
            this.localActions = this.localActions || [];
            if (this.isEditable) {
                this.on("edit", this.onRemoteNodeEditComplete, this);
                this.on("canceledit", this.onRemoteNodeCancelEdit, this);
            }
            if (this.ddPlugin) {
                this.getView().on("beforedrop", this.onRemoteBeforeNodeDrop, this);
            }
        } else if (mode === "local" && this.mode === "remote") {
            if (this.editors) {
                Ext.each(this.editors, function(editor) {
                    editor.un("complete", this.onRemoteNodeEditComplete, this);
                    editor.un("canceledit", this.onRemoteNodeCancelEdit, this);
                }, this);
            }
            if (this.enableDD) {
                this.un("beforenodedrop", this.onRemoteBeforeNodeDrop, this);
            }
        }
        this.mode = mode;
    },
    remoteOptions: function(action, node) {
        var dc = Ext.apply({}, this.directEventConfig || {}),
            options = {
                action: action,
                node: node,
                params: {}
            };
        if (this.fireEvent("beforeremoteaction", this, node, options, action) !== false) {
            dc.userSuccess = Ext.Function.bind(this.remoteActionSuccess, this);
            dc.userFailure = Ext.Function.bind(this.remoteActionFailure, this);
            dc.extraParams = options.params;
            dc.node = node;
            dc.control = this;
            dc.eventType = "postback";
            dc.action = action;
            if (!Ext.isEmpty(this[action + "Url"], false)) {
                dc.url = this[action + "Url"];
                dc.cleanRequest = true;
            }
            return dc;
        }
        return false;
    },
    remoteActionSuccess: function(response, result, context, type, action, extraParams, o) {
        if (o.node) {
            o.node.set("loading", false);
        }
        var rParams;
        try {
            rParams = result.extraParamsResponse || result.response || (result.d ? result.d.response : {}) || {};
            var responseObj = result.serviceResponse || result.d || result;
            result = {
                success: Ext.isDefined(responseObj.actionSuccess) ? responseObj.actionSuccess : responseObj.success,
                msg: responseObj.message,
                attributes: rParams.ra_applyObject || rParams.attributes
            };
        } catch (ex) {
            this.fireEvent("remoteactionexception", this, response, ex, o);
            if (o.cancelWarningFailure !== true && (this.directEventConfig || {}).showWarningFailure !== false && !this.hasListener("remoteactionexception")) {
                Ext.net.DirectEvent.showFailure(response, result.msg);
            }
            return;
        }
        if (result.success !== true) {
            this.fireEvent("remoteactionrefusal", this, response, {
                message: result.msg
            }, o);
            if (o.action === "raAppend" || o.action === "reInsert") {
                o.node.parentNode.removeChild(o.node);
            } else if (o.action === "raMove") {
                o.e.dropHandlers.cancelDrop();
            } else {
                o.node.reject();
            }
            return;
        }
        if (Ext.isObject(result.attributes)) {
            o.node.set(result.attributes);
        }
        if (o.action != "raEdit" && Ext.isDefined(rParams.value)) {
            o.node.set("text", rParams.value);
        }
        var id = rParams.ra_id || rParams.id;
        if (id) {
            o.node.setId(id);
        }
        switch (o.action) {
            case "raEdit":
                if (o.isRowEditing) {
                    if (Ext.isDefined(rParams.ra_newValues) || Ext.isDefined(rParams.value) || !o.fromEditor) {
                        o.node.set(rParams.ra_newValues || rParams.value || o.raConfig.newValues);
                    }
                } else if (Ext.isDefined(rParams.ra_newValue) || Ext.isDefined(rParams.value) || !o.fromEditor) {
                    o.node.set(o.raConfig.field, rParams.ra_newValue || rParams.value || o.raConfig.newValue);
                }
                break;
            case "raRemove":
                o.node.parentNode.removeChild(o.node);
                break;
            case "raMove":
                if (o.e.currentPosition === "append") {
                    o.e.overNode.expand();
                    if (o.e.overNode.data.loaded || o.e.overNode.isLeaf()) {
                        o.e.dropHandlers.processDrop();
                    } else {
                        o.e.dropHandlers.cancelDrop();
                        var parentNode = o.node.parentNode,
                            index = parentNode.indexOf(o.node);
                        o.node.remove();
                        o.e.overNode.on("load", function() {
                            var index = this.newParent.indexOfId(this.id),
                                node;
                            if (index >= 0) {
                                node = this.newParent.getChildAt(index);
                                node.fireEvent("move", node, this.oldParent, this.newParent, this.index);
                            }
                        }, {
                            tree: this,
                            oldParent: parentNode,
                            newParent: o.e.overNode,
                            id: o.node.getId(),
                            index: index
                        }, {
                            single: true
                        });
                    }
                } else {
                    o.e.dropHandlers.processDrop();
                }
                break;
            case "raAppend":
            case "raInsert":
                this.getSelectionModel().select(o.node);
                break;
        }
        o.node.commit();
        this.fireEvent("remote" + action.toLowerCase().substr(2) + "success", this, o.node, action, o);
        this.fireEvent("remoteactionsuccess", this, o.node, action, o);
    },
    remoteActionFailure: function(response, result, context, type, action, extraParams, o) {
        if (o.node) {
            o.node.set('loading', false);
        }
        if (o.action === "raAppend" || o.action === "reInsert") {
            o.node.parentNode.removeChild(o.node);
        } else if (o.action === "raMove") {
            o.e.dropHandlers.cancelDrop();
        } else {
            o.node.reject();
        }
        this.fireEvent("remoteactionexception", this, response, {
            message: response.statusText
        }, o);
        if (o.cancelWarningFailure !== true && (this.directEventConfig || {}).showWarningFailure !== false && !this.hasListener("remoteactionexception")) {
            Ext.net.DirectEvent.showFailure(response, response.responseText);
        }
    },
    onRemoteNodeEditComplete: function(editor, e) {
        if (e.record.isNew) {
            var insert = e.record.insertAction;
            delete e.record.isNew;
            delete e.record.insertAction;
            this.appendChildRequest(e.record, insert);
            return;
        }
        this.editNode(e.record, e.field, e.value, e);
        return false;
    },
    onRemoteNodeCancelEdit: function(editor, e) {
        if (e.record.isNew) {
            e.record.parentNode.removeChild(editor.record);
        }
    },
    performRemoteAction: function(config) {
        if (config.cleanRequest) {
            if (this.remoteJson) {
                config.json = true;
                config.method = "POST";
            }
            config.extraParams = Ext.apply(config.extraParams, config.raConfig);
            config.type = "load";
        } else {
            config.serviceParams = Ext.encode(config.raConfig);
        }
        config.node.set('loading', true);
        Ext.net.DirectEvent.request(config);
    },
    appendChildRequest: function(node, insert) {
        if (this.mode === "local" || Ext.Array.indexOf(this.localActions, insert ? "insert" : "append") !== -1) {
            return;
        }
        var dc = this.remoteOptions("ra" + (insert ? "Insert" : "Append"), node);
        if (dc !== false && this.fireEvent("beforeremote" + (insert ? "insert" : "append"), this, node, dc.extraParams, insert) !== false) {
            dc.raConfig = {
                id: node.getId(),
                parentId: node.parentNode.getId(),
                text: this.convertText(node.data.text),
                index: node.parentNode.indexOf(node)
            };
            this.performRemoteAction(dc);
        }
    },
    editNode: function(node, field, value, e) {
        field = field || "text";
        if (this.mode === "local" || Ext.Array.indexOf(this.localActions, "edit") !== -1) {
            if (!e) {
                node.set(field, value);
            }
            return;
        }
        var dc = this.remoteOptions("raEdit", node);
        if (dc !== false && this.fireEvent("beforeremoteedit", this, node, dc.extraParams) !== false) {
            dc.raConfig = {
                id: node.getId(),
                field: field,
                newValue: this.convertText(value),
                oldValue: this.convertText(e ? e.originalValue : node.get(field))
            };
            if (e && e.newValues) {
                dc.raConfig.newValues = e.newValues;
                dc.raConfig.oldValues = e.originalValues;
                dc.raConfig.isRow = true;
                delete dc.raConfig.field;
                delete dc.raConfig.newValue;
                delete dc.raConfig.oldValue;
                dc.isRowEditing = true;
            }
            dc.fromEditor = !!e;
            this.performRemoteAction(dc);
        }
    },
    convertText: function(text) {
        if (!Ext.isString(text)) {
            return text;
        }
        if (text == "&#160;") {
            return "";
        }
        return Ext.util.Format.htmlEncode(text);
    },
    onRemoteBeforeNodeDrop: function(node, data, overRecord, currentPosition, dropHandlers) {
        if (this.mode === "local" || Ext.Array.indexOf(this.localActions, "move") !== -1) {
            return true;
        }
        this.moveNodeRequest(node, data, overRecord, currentPosition, dropHandlers);
        dropHandlers.wait = true;
        return false;
    },
    moveNodeRequest: function(node, data, overNode, currentPosition, dropHandlers) {
        if (this.mode === "local" || Ext.Array.indexOf(this.localActions, "move") !== -1) {
            return;
        }
        var dc = this.remoteOptions("raMove", data.records[0]);
        if (dc !== false && this.fireEvent("beforeremotemove", this, data.records, overNode, {
                node: node,
                data: data,
                overNode: overNode,
                currentPosition: currentPosition,
                dropHandlers: dropHandlers
            }, dc.extraParams) !== false) {
            dc.e = {
                dropHandlers: dropHandlers,
                data: data,
                overNode: overNode,
                currentPosition: currentPosition
            };
            var ids = [],
                parentIds = [];
            Ext.each(data.records, function(r) {
                ids.push(r.getId());
                parentIds.push(r.parentNode.getId());
            });
            dc.raConfig = {
                ids: ids,
                targetId: overNode.getId(),
                parentIds: parentIds,
                point: currentPosition
            };
            dropHandlers.wait = true;
            this.performRemoteAction(dc);
        }
    },
    removeNode: function(node) {
        if (node.isRoot()) {
            return;
        }
        if (this.mode === "local" || Ext.Array.indexOf(this.localActions, "remove") !== -1) {
            node.parentNode.removeChild(node);
            return;
        }
        var dc = this.remoteOptions("raRemove", node);
        if (dc !== false && this.fireEvent("beforeremoteremove", this, node, dc.extraParams) !== false) {
            dc.raConfig = {
                id: node.getId(),
                parentId: node.parentNode.getId()
            };
            this.performRemoteAction(dc);
        }
    },
    appendChild: function(parentNode, defaultText, insert, index) {
        var node = parentNode,
            nodeAttr = {},
            child;
        if (node.isLeaf()) {
            node.data.leaf = false;
            node.data.loaded = true;
            this.store.fireEvent('update', this, node, Ext.data.Model.EDIT, null);
        }
        this.getView().animate = false;
        node.expand(false);
        this.getView().animate = this.enableAnimations;
        if (Ext.isString(defaultText)) {
            nodeAttr = {
                text: defaultText || "",
                loaded: true,
                leaf: true
            };
        } else {
            nodeAttr = Ext.applyIf(defaultText, {
                text: "",
                loaded: true
            });
        }
        if (insert) {
            var beforeNode = index ? node.childNodes[index] : node.firstChild;
            child = node.insertBefore(nodeAttr, beforeNode);
        } else {
            child = node.appendChild(nodeAttr);
        }
        child.isNew = true;
        child.insertAction = insert;
        this.startEdit(child, this.headerCt.items.items[0]);
    },
    insertBefore: function(node, defaultText) {
        var nodeAttr = {},
            child;
        if (Ext.isString(defaultText)) {
            nodeAttr = {
                text: defaultText || "",
                loaded: true,
                leaf: true
            };
        } else {
            nodeAttr = Ext.applyIf(defaultText, {
                text: "",
                loaded: true
            });
        }
        child = node.parentNode.insertBefore(nodeAttr, node);
        child.isNew = true;
        child.insertAction = true;
        this.startEdit(child, this.headerCt.items.items[0]);
    },
    startEdit: function(node, columnHeader) {
        if (typeof node === "string") {
            node = this.store.getNodeById(node);
        }
        this.getSelectionModel().select(node);
        if (this.editingPlugin) {
            this.editingPlugin.startEdit(node, columnHeader);
        }
    },
    completeEdit: function() {
        if (this.editingPlugin) {
            this.editingPlugin.completeEdit();
        }
    },
    cancelEdit: function() {
        if (this.editingPlugin) {
            this.editingPlugin.cancelEdit();
        }
    }
});

Ext.tree.Column.override({
    initComponent: Ext.Function.createSequence(Ext.tree.Column.prototype.initComponent, function() {
        this.renderer = Ext.Function.createInterceptor(this.renderer, function(value, metaData, record, rowIdx, colIdx, store, view) {
            var iconCls = record.data.iconCls;
            if (iconCls && iconCls[0] === "#") {
                record.data.iconCls = X.net.RM.getIcon(iconCls.substring(1));
            }
        });
    })
});

Ext.tree.View.override({
    initComponent: function() {
        this.callParent(arguments);
        if (this.toggleOnClick) {
            this.toggleOnDblClick = false;
        }
    },
    getChecked: function() {
        var checked = [],
            node = this.node || (this.getTreeStore().getRootNode());
        if (node) {
            node.cascadeBy(function(rec) {
                if (rec.get('checked')) {
                    checked.push(rec);
                }
            });
        }
        return checked;
    },
    onItemClick: function(record, item, index, e) {
        var me = this,
            editingPlugin = me.editingPlugin,
            parent = this.callParent(arguments);
        if (me.toggleOnClick && record.isExpandable() && !e.getTarget(this.expanderSelector, item) && !(editingPlugin && editingPlugin.clicksToEdit === 1)) {
            me.toggle(record);
        }
        return parent;
    }
});

Ext.tree.ViewDropZone.override({
    getPosition: function(e, node) {
        var view = this.view,
            record = view.getRecord(node),
            y = e.getPageY(),
            noAppend = record.isLeaf() && view.allowLeafDrop !== true,
            noBelow = false,
            region = Ext.fly(node).getRegion(),
            fragment;
        if (record.isRoot()) {
            return 'append';
        }
        if (this.appendOnly) {
            return noAppend ? false : 'append';
        }
        if (!this.allowParentInsert) {
            noBelow = record.hasChildNodes() && record.isExpanded();
        }
        fragment = (region.bottom - region.top) / (noAppend ? 2 : 3);
        if (y >= region.top && y < (region.top + fragment)) {
            return 'before';
        } else if (!noBelow && (noAppend || (y >= (region.bottom - fragment) && y <= region.bottom))) {
            return 'after';
        } else {
            return 'append';
        }
    }
});
Ext.tree.plugin.TreeViewDragDrop.override({
    init: function(view) {
        view.on("afterrender", this.onViewRender, this, {
            single: true
        });
        view.panel.ddPlugin = this;
        view.ddPlugin = this;
        view.allowLeafDrop = this.allowLeafDrop;
        if (this.allowLeafDrop) {
            view.on("drop", function(node, data, overRecord, currentPosition) {
                if (currentPosition == "append" && overRecord.isLeaf()) {
                    overRecord.set("leaf", false);
                    overRecord.set("loaded", true);
                }
            });
        }
    }
});

Ext.draw.Component.override({
    get: function(key) {
        return this.surface.items.get(key);
    }
});
Ext.draw.Surface.override({
    onAdd: function(sprite) {
        var group = sprite.group,
            draggable = sprite.draggable,
            groups, ln, i;
        if (group) {
            groups = [].concat(group);
            ln = groups.length;
            for (i = 0; i < ln; i++) {
                group = groups[i];
                this.getGroup(group).add(sprite);
            }
            delete sprite.group;
        }
        if (draggable) {
            if (sprite.el) {
                sprite.initDraggable();
            } else {
                sprite.on("render", sprite.initDraggable, sprite, {
                    single: true
                });
            }
        }
    }
});

Ext.draw.Sprite.override({
    constructor: Ext.Function.createSequence(Ext.draw.Sprite.prototype.constructor, function(config) {
        if (config.id && this.id !== config.id) {
            this.id = config.id;
        }
    })
});



Ext.resizer.Splitter.override({
    getCollapseTarget: function() {
        var me = this;
        if (me.collapseTarget != "prev" && me.collapseTarget != "next" && Ext.isString(me.collapseTarget)) {
            var cmp = Ext.net.ResourceMgr.getCmp(me.collapseTarget);
            if (cmp) {
                me.collapseTarget = cmp;
            }
        }
        return me.collapseTarget.isComponent ? me.collapseTarget : me.collapseTarget == 'prev' ? me.previousSibling() : me.nextSibling();
    }
});

Ext.define("Ext.net.MessageBus", {
    mixins: {
        observable: 'Ext.util.Observable'
    },
    statics: {
        initEvents: function(owner) {
            if (owner.messageBusListeners) {
                var busListeners = [];
                Ext.each(owner.messageBusListeners, function(listener) {
                    var bus = listener.bus ? Ext.net.ResourceMgr.getCmp(listener.bus) : Ext.net.Bus,
                        name = listener.name || "**";
                    if (owner instanceof Ext.net.MessageBus) {
                        bus = owner;
                    }
                    if (!bus) {
                        throw new Error("Bus is not found: " + listener.bus);
                    }
                    listener.scope = listener.scope || owner;
                    busListeners.push({
                        name: name,
                        fn: bus.subscribe(name, listener),
                        bus: bus,
                        scope: listener.scope
                    });
                });
                if (owner.on && busListeners.length) {
                    owner.on("destroy", function() {
                        Ext.each(busListeners, function(item) {
                            item.bus.unsubscribe(item.name, item.fn, item.scope);
                        });
                    });
                }
                owner.messageBusListeners = null;
            }
            if (owner.messageBusDirectEvents) {
                var busDirectEvents = [];
                Ext.each(owner.messageBusDirectEvents, function(listener) {
                    var bus = listener.bus ? Ext.net.ResourceMgr.getCmp(listener.bus) : Ext.net.Bus,
                        name = listener.name || "**";
                    if (owner instanceof Ext.net.MessageBus) {
                        bus = owner;
                    }
                    if (!bus) {
                        throw new Error("Bus is not found: " + listener.bus);
                    }
                    listener.isDirect = true;
                    listener.scope = listener.scope || owner;
                    busDirectEvents.push({
                        name: name,
                        fn: bus.subscribe(name, listener),
                        bus: bus,
                        scope: listener.scope
                    });
                });
                if (owner.on && busDirectEvents.length) {
                    owner.on("destroy", function() {
                        Ext.each(busDirectEvents, function(item) {
                            var _events = item.bus.events;
                            item.bus.events = item.bus.directListeners;
                            item.bus.unsubscribe(item.name, item.fn, item.scope);
                            item.bus.events = _events;
                        });
                    });
                }
                owner.messageBusDirectEvents = null;
            }
        }
    },
    constructor: function(config) {
        var isDefault = !Ext.net.Bus;
        Ext.apply(this, config || {});
        if (this.defaultBus) {
            Ext.net.Bus = this;
        }
        Ext.net.ComponentManager.registerId(this);
        this.addEvents("message");
        this.mixins.observable.constructor.call(this);
    },
    destroy: function() {
        Ext.net.ComponentManager.unregisterId(this);
    },
    messageFilter: function(name) {
        var tokens = name.split('.'),
            len = tokens.length,
            tokenRe = /^\w+$/,
            token, i;
        for (i = 0; i < len; i++) {
            token = tokens[i];
            if (!tokenRe.test(token) && token !== "*" && (token !== "**" || i !== (len - 1))) {
                throw new Error('Incorrect event name: ' + name);
            }
            if (token === "**") {
                tokens[i] = ".*";
            } else if (token === "*") {
                tokens[i] = "\\w+";
            }
        }
        return new RegExp("^" + tokens.join("\\.") + "$");
    },
    subscribe: function(name, fn, config) {
        config = config || {};
        if (Ext.isObject(fn)) {
            config = fn;
        } else {
            config.fn = fn;
        }
        config.filter = this.messageFilter(name);
        config.name = name;
        var fn = Ext.bind(this.onMessage, this);
        this[config.isDirect ? "addDirectListener" : "on"]("message", fn, config.scope || this, config);
        return fn;
    },
    unsubscribe: function(name, fn, scope) {
        this.un("message", fn, scope || this);
    },
    publish: function(name, data, target, fromParent) {
        if (target == this) {
            return;
        }
        this.fireEvent("message", name, data);
        if (!target) {
            target = this;
        }
        if (parent != window && fromParent !== true) {
            this.publishToFrame(parent, name, data, target);
        }
        var frames = window.frames,
            i;
        for (i = 0; i < frames.length; i++) {
            this.publishToFrame(frames[i], name, data, target, true);
        }
    },
    publishToFrame: function(frame, name, data, target, fromParent) {
        var bus;
        try {
            if (this.defaultBus && frame.Ext && frame.Ext.net && frame.Ext.net.Bus) {
                bus = frame.Ext.net.Bus;
            } else if (frame.Ext && frame.Ext.net && frame.Ext.net.ResourceMgr) {
                bus = frame.Ext.net.ResourceMgr.getCmp(this.nsId);
            }
            if (bus) {
                bus.publish(name, data, target, fromParent);
            }
        } catch (e) {}
    },
    onMessage: function(name, data, config) {
        if (config.filter.test(name)) {
            (config.fn || Ext.emptyFn).call(config.scope || this, name, data, config);
        }
    }
}, function() {
    Ext.net.MessageBus.override(Ext.util.DirectObservable);
    Ext.net.Bus = Ext.create("Ext.net.MessageBus");
    Ext.net.Bus.defaultBus = true;
});

Ext.util.Observable.override(Ext.util.DirectObservable);
Ext.AbstractComponent.override(Ext.util.DirectObservable);
Ext.data.AbstractStore.override(Ext.util.DirectObservable);
Ext.grid.plugin.Editing.override(Ext.util.DirectObservable);
Ext.app.Controller.override(Ext.util.DirectObservable);
Ext.chart.series.Series.override(Ext.util.DirectObservable);
Ext.data.Batch.override(Ext.util.DirectObservable);
Ext.data.Connection.override(Ext.util.DirectObservable);
Ext.data.Model.override(Ext.util.DirectObservable);
Ext.data.proxy.Proxy.override(Ext.util.DirectObservable);
Ext.dd.DragTracker.override(Ext.util.DirectObservable);
Ext.draw.Sprite.override(Ext.util.DirectObservable);
Ext.draw.Surface.override(Ext.util.DirectObservable);
Ext.ElementLoader.override(Ext.util.DirectObservable);
Ext.fx.Anim.override(Ext.util.DirectObservable);
Ext.fx.Animator.override(Ext.util.DirectObservable);
Ext.grid.LockingView.override(Ext.util.DirectObservable);
Ext.LoadMask.override(Ext.util.DirectObservable);
Ext.resizer.Resizer.override(Ext.util.DirectObservable);
Ext.state.Provider.override(Ext.util.DirectObservable);
Ext.util.AbstractMixedCollection.override(Ext.util.DirectObservable);
Ext.ux.RowExpander.override(Ext.util.DirectObservable);
(function() {
    var buf = [];
    if (!Ext.isIE6) {
        buf.push(".x-label-icon{width:16px;height:16px;margin-left:3px;margin-right:3px;vertical-align:middle;border:0px !important;}");
    }
    if (Ext.isIE6) {
        buf.push(".x-label-icon{width:16px;height:16px;vertical-align:middle;}");
    }
    if (Ext.isIE8) {
        buf.push(".x-item-disabled span.x-btn-icon-el { filter: alpha(opacity=50); }");
    }
    buf.push("input.x-tree-node-cb{margin-left:1px;height:18px;vertical-align:bottom;}.x-tree-node .x-tree-node-inline-icon{background:transparent;height:16px !important;}");
    buf.push(".x-toolbar-flat{padding:0px !important;border:0px !important;background:none !important;background-color: transparent !important; background-image: none !important;}");
    buf.push(".x-grid .x-row-expander-control TABLE{table-layout: auto;} .x-grid .x-row-expander-control TABLE.x-grid-table{table-layout:fixed;}");
    buf.push(".x-grid-row-checker-on{background-position:-25px 0 !important;}");
    buf.push(".x-grid-header-widgets{border-top-width:0px;} .x-grid-header-widgets .x-form-item{margin-bottom:1px;} .x-border-box .x-ie9 .x-grid-header-ct{padding-left:0px;}");
    if (Ext.isGecko) {
        buf.push(".x-theme-neptune .x-gecko .x-form-text { padding: 4px 6px 2px; }");
        buf.push(".x-theme-neptune .x-gecko .x-panel-header-horizontal-noborder { padding: 9px 10px 9px 10px; }");
        buf.push(".x-theme-neptune .x-gecko .x-panel-header-vertical-noborder { padding: 10px 9px 10px 9px; }");
        buf.push(".x-theme-neptune .x-gecko .x-panel-header-text-container { line-height: 17px; }");
    }
    Ext.net.ResourceMgr.registerCssClass("Ext.Net.CSS", buf.join(""));
    Ext.net.ResourceMgr.notifyScriptLoaded();
})();