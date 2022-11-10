# draggable-window
The draggable window module from my [MightyOS](https://mightycoderx.github.io/MightyOS/) made into a simple to use, drop in web component
<br>
<br>
![image](https://user-images.githubusercontent.com/36588044/198869837-dc7f4d67-39f8-4230-8942-722e24392c66.png)
<br>
<br>
Try it at https://mightycoderx.github.io/draggable-window/

## How To Use
1. Add script to head
    ```html
    <script src="https://cdn.jsdelivr.net/gh/MightyCoderX/draggable-window@master/DraggableWindow.min.js"></script>

    ```
1. Use custom element with the needed properties
    ```html
    <draggable-window 
        window-title="Example" 
        content-url="https://example.com" 
        minimize-origin="20 20"
        onclose="console.log('closed!', this)"
    >
    </draggable-window>
    ```

For a full example look at [`index.html`](./index.html)

## TODO
- [ ] Update folder structure to use src and dist/build
- [ ] Fix multi-click on mobile
