'use strict';

const draggableWindowTemplate = document.createElement('template');

draggableWindowTemplate.innerHTML = `
    <style>
        *
        {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            user-select: none;
        }

        .window
        {
            --header-height: 30px;
            --window-width: 60vw;
            --transition-duration: 0.08s;
        
            position: absolute;
            display: block;
            color: white;
            font-family: sans-serif;
            top: 20px;
            left: 100px;
            border-radius: 0.5rem 0.5rem 0 0;
            overflow: hidden;
            box-shadow: 0px 0px 5px #222222a4;
            transition-property: transform;
            transition-duration: var(--transition-duration);
            transition-timing-function: ease-in;
            pointer-events: all;
            width: var(--window-width);
            height: calc(var(--window-width) * 9/16);
            min-width: 100px;
            min-height: 100px;
            resize: both;
        }

        .window.minimized
        {
            transition-property: scale, top, left;
        }

        .window.maximized
        {
            transition-property: scale, top, left, width, height, border-radius;
        }

        .window .header
        {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 0.6rem;
            background: #222;
            height: var(--header-height);
            font-size: 14px;
        }
        
        .window .header .title
        {
            pointer-events: none;
            user-select: none;
            line-height: 0;
        }
        
        .window .header .left-buttons
        {
            position: relative;
            right: 0;
            display: flex;
            gap: 5px;
        }
        
        .window .header .left-buttons span
        {
            position: relative;
            display: grid;
            width: 15px;
            height: 15px;
            border-radius: 100rem;
            place-items: center;
        }
        
        .window .header .left-buttons .minimize
        {
            background: orange;
        }
        
        .window .header .left-buttons .maximize
        {
            background: green;
        }
        
        .window .header .left-buttons .close
        {
            background: red;
        }
        
        .window .body
        {
            background: #333;
            height: calc(100% - var(--header-height));
            width: 100%;
            user-select: none;
            border: 1px solid #222;
        }

        .window .body iframe
        {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
    <div class="window">
        <div class="header">
            <span class="title"></span>

            <div class="left-buttons"> 
                <span class="minimize"></span>
                <span class="maximize"></span>
                <span class="close"></span>
            </div>
        </div>
        <div class="body">
            <iframe src="."></iframe>
        </div>
    </div>
`;

class DraggableWindow extends HTMLElement
{
    #shadow;

    #windowFrame;
    #header;
    #titleElem;
    #btnMinimize;
    #btnMaximize;
    #btnClose;
    #iframe;
    
    #focused;

    #minimizeOrigin;
    
    #maximized;
    #minimized;
    #headerMouseDown;
    
    #startSize;
    #size;

    #closeEvent;
    
    #_position;

    constructor()
    {
        super();


        this.#shadow = this.attachShadow({ mode: 'closed' });
        this.#shadow.append(draggableWindowTemplate.content.cloneNode(true));
    }

    connectedCallback()
    {
        this.#windowFrame = this.#shadow.querySelector('.window');
        this.#header = this.#shadow.querySelector('.header');
        this.#titleElem = this.#shadow.querySelector('.header .title');
        this.#btnMinimize = this.#shadow.querySelector('.header .minimize');
        this.#btnMaximize = this.#shadow.querySelector('.header .maximize');
        this.#btnClose = this.#shadow.querySelector('.header .close');
        this.#iframe = this.#shadow.querySelector('.window .body iframe');

        this.#focused = false;

        //Attributes
        this.#titleElem.innerText = this.getAttribute('window-title');
        this.#iframe.src = this.getAttribute('content-url');
        const minimizeOrigin = this.getAttribute('minimize-origin').split(' ');
        this.#minimizeOrigin =
        {
            x: +minimizeOrigin[0],
            y: +minimizeOrigin[1]
        };

        this.#startSize =
        {
            width: this.#windowFrame.clientWidth,
            height: this.#windowFrame.clientHeight
        };
        
        this.#size = this.#startSize;

        this.#position =
        { 
            x: window.innerWidth/2-this.#size.width/2, 
            y: 100
        };

        this.#maximized = false;
        this.#minimized = false;
        this.#headerMouseDown = false;

        this.#closeEvent = new CustomEvent('close', {
            bubbles: true,
            cancelable: false,
            composed: true
        });
        
        this.#btnMinimize.addEventListener('click', () => this.minimize());
        this.#btnMaximize.addEventListener('click', () => this.maximize());
        this.#btnClose.addEventListener('click', () => this.close());


        new ResizeObserver(() =>
        {
            let { width, height } = this.#windowFrame.getBoundingClientRect();
            this.#size = { width, height };

        }).observe(this.#windowFrame);

        this.#windowFrame.style.width = this.#startSize.width + 'px';
        this.#windowFrame.style.height = this.#startSize.height + 'px';

        // TODO: fix focus on click on the window body
        // this.body.contentWindow.addEventListener('click', () =>
        // {
        //     console.log('Focusing this window', this.title);
        //     this.focusWindow();
        // });

        this.#header.addEventListener('dblclick', () => this.maximize());
        
        this.#focusWindow();
        this.#dragWindow();
        // this.resize();
    }

    set #position({x, y})
    {
        this.#_position = {x, y};
        this.#windowFrame.style.left = `${x}px`;
        this.#windowFrame.style.top = `${y}px`;
    }

    get #position()
    {
        return this.#_position;
    }

    #focusWindow()
    {
        this.#focused = true;
        this.#windowFrame.style.zIndex = '1';
        
        this.#iframe.contentWindow.focus();
    }

    //TODO sort out this mess
    #dragWindow()
    {
        let windowMouseX, windowMouseY;
        
        let mouseDown = (e) =>
        {
            if(!e.target.matches('.header')) return;

            this.#focusWindow();

            let clientX = e.clientX | e.changedTouches?.[0].pageX;
            let clientY = e.clientY | e.changedTouches?.[0].pageY;
            
            this.#headerMouseDown = true;
            windowMouseX = clientX - this.#windowFrame.offsetLeft;
            windowMouseY = clientY - this.#windowFrame.offsetTop;
            this.#iframe.style.pointerEvents = 'none';

            
            window.addEventListener('mouseup', mouseUp);
            window.addEventListener('touchend', mouseUp);
            window.addEventListener('touchcancel', mouseUp);
        }
    
        this.#header.addEventListener('mousedown', mouseDown);
        this.#header.addEventListener('touchstart', mouseDown);
        
        
        let mouseUp = (e) =>
        {
            this.#headerMouseDown = false;
            this.#header.removeEventListener('mousemove', mouseMove);
            this.#iframe.style.pointerEvents = 'all';
        }

        
        let mouseMove = (e) =>
        {
            let clientX = e.clientX | e.changedTouches?.[0].pageX;
            let clientY = e.clientY | e.changedTouches?.[0].pageY;
            
            if(this.#headerMouseDown)
            {
                if(this.#maximized)
                {
                    this.maximize(false);
                    
                    this.#position =
                    { 
                        x: clientX - this.#startSize.width/2, 
                        y: clientY - this.#header.offsetHeight/2 
                    };

                    windowMouseX = clientX - this.#windowFrame.offsetLeft;
                    windowMouseY = clientY - this.#windowFrame.offsetTop;
                }
                windowDrag(clientX, clientY);
                
                // if(!maximized && this.windowContainer.offsetTop <= 5)
                // {
                //     mouseDown = false;
                //     this.maximize();
                //     this.windowContainer.blur();
                //     return;
                // }
            }   
        }
            
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('touchmove', mouseMove);

        window.addEventListener('mouseleave', e =>
        {
            this.#headerMouseDown = false;
        });
    
        let windowDrag = (clientX, clientY) =>
        {
            this.#position =
            { 
                x: clientX - windowMouseX,
                y: clientY - windowMouseY 
            };
        }
    }

    minimize()
    {
        if(!this.#minimized)
        {
            this.#position.x = this.#windowFrame.getBoundingClientRect().x;
            this.#position.y = this.#windowFrame.getBoundingClientRect().y;

            this.#windowFrame.classList.add('minimized');
            
            this.#windowFrame.style.transformOrigin = `${this.#minimizeOrigin.x}px ${this.#minimizeOrigin.y}px`;
            this.#windowFrame.style.left = `${this.#minimizeOrigin.x - this.#size.width/4}px`;
            this.#windowFrame.style.top = `${this.#minimizeOrigin.y + this.#size.height}px`;
            this.#windowFrame.style.scale = 0;
            this.#minimized = true;
        }
        else
        {
            this.#windowFrame.style.transformOrigin = `${this.#minimizeOrigin.x}px ${this.#minimizeOrigin.y}px`;
            this.#windowFrame.style.left = `${this.#position.x}px`;
            this.#windowFrame.style.top = `${this.#position.y}px`;
            this.#windowFrame.style.scale = 1;
            this.#minimized = false;

            this.afterFrameTransition(e =>
            {
                e.target.classList.remove('minimized')
            });
        }
    }

    maximize(animateBack = true)
    {
        if(!this.#maximized)
        {
            this.#startSize = 
            {
                width: this.#windowFrame.clientWidth, 
                height: this.#windowFrame.clientHeight 
            };

            this.#windowFrame.classList.add('maximized');
            
            this.#windowFrame.style.top = 0;
            this.#windowFrame.style.left = 0;
            this.#windowFrame.style.width = '100%';
            this.#windowFrame.style.height = '100%';
            this.#windowFrame.style.borderRadius= 0;
            this.#maximized = true;
        }
        else
        {
            this.#position =
            { 
                x: this.#position.x, 
                y: this.#position.y 
            };

            this.#windowFrame.style.width = this.#startSize.width+'px';
            this.#windowFrame.style.height = this.#startSize.height+'px';
            this.#windowFrame.style.borderRadius= '';
            this.#maximized = false;

            if(animateBack)
            {
                this.afterFrameTransition(e =>
                {
                    e.target.classList.remove('maximized');
                });
            }
            else
            {
                this.#windowFrame.classList.remove('maximized');
            }
        }
    }

    afterFrameTransition(callback)
    {
        const onTransitionEnd = e =>
        {
            callback(e);
            this.#windowFrame.removeEventListener('transitionend', onTransitionEnd);
        };
        this.#windowFrame.addEventListener('transitionend', onTransitionEnd);
    }

    close()
    {
        this.dispatchEvent(this.#closeEvent);
        this.#windowFrame.style.transformOrigin = 'center';
        this.#windowFrame.style.scale = 0;

        this.afterFrameTransition(() => this.remove());
    }
}

customElements.define('draggable-window', DraggableWindow);
