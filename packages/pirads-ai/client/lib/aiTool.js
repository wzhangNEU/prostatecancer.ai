import { cornerstoneTools, cornerstone } from 'meteor/ohif:cornerstone';
import { getNewContext, draw } from './drawing.js';
import { OHIF } from 'meteor/ohif:core';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { waitUntilExists } from 'jquery.waituntilexists';

$('#aiFiducial').waitUntilExists((index, element) => {
    $(element).click((eve) => {
        if (!($('.report-btn a:first').hasClass('active'))) {
            $('.report-btn a:first').trigger('click');
            $('.roundedButtonWrapper[data-value="findings"].active').waitUntilExists(() => {
                $('.roundedButtonWrapper[data-value="aiModel"]').trigger('click');
            });
        }
    });
});

const toolType = 'aiFiducial';

const createDialog = (eventData, measurementData) => {

    const nearbyToolData = {};
    nearbyToolData.toolType = toolType;
    nearbyToolData.tool = measurementData;

    const dialogSettings = {
        removeCloseButton: true,
        message: 'Do you want to keep this finding?',
        cancelLabel: 'No',
        confirmLabel: 'Yes',
        confirmClass: 'btn-success',
        cancelClass: 'btn-danger',
        dialogClass: 'modal-sm',
        position: {
            x: eventData.event.clientX+155,
            y: eventData.event.clientY+130
        }
    };

    Session.set('nearbyToolData', nearbyToolData);

    OHIF.ui.showDialog('dialogAi', dialogSettings);
};


// /////// BEGIN ACTIVE TOOL ///////
function createNewMeasurement (mouseEventData) {
  // Create the measurement data for this tool with the end handle activated
  const measurementData = {
    visible: true,
    active: true,
    color: undefined,
    handles: {
      end: {
        x: mouseEventData.currentPoints.image.x,
        y: mouseEventData.currentPoints.image.y,
        highlight: true,
        active: true
      }
    }
  };

  createDialog(mouseEventData, measurementData);

  return measurementData;
}
// /////// END ACTIVE TOOL ///////

// /////// BEGIN IMAGE RENDERING ///////
function pointNearTool (element, data, coords) {
  if (data.visible === false) {
    return false;
  }

  const endCanvas = cornerstone.pixelToCanvas(element, data.handles.end);


  return cornerstoneMath.point.distance(endCanvas, coords) < 5;
}

function onImageRendered (e) {
  const eventData = e.detail;

  // If we have no toolData for this element, return immediately as there is nothing to do
  const toolData = cornerstoneTools.getToolState(e.currentTarget, toolType);

  if (!toolData) {
    return;
  }

  // We have tool data for this element - iterate over each one and draw it
  const context = getNewContext(eventData.canvasContext.canvas);

  const fontHeight = cornerstoneTools.textStyle.getFontSize();

  for (let i = 0; i < toolData.data.length; i++) {
    const data = toolData.data[i];

    if (data.visible === false) {
      continue;
    }

    draw(context, (context) => {

      const color = cornerstoneTools.toolColors.getColorIfActive(data);

      // Draw the handles
      cornerstoneTools.drawHandles(context, eventData, data.handles, color);

      const x = Math.round(data.handles.end.x);
      const y = Math.round(data.handles.end.y);
      let storedPixels;

      let text,
        str;

      if (x >= 0 && y >= 0 && x < eventData.image.columns && y < eventData.image.rows) {
        if (eventData.image.color) {
          text = `${x}, ${y}`;
          storedPixels = cornerstoneTools.getRGBPixels(eventData.element, x, y, 1, 1);
          str = `R: ${storedPixels[0]} G: ${storedPixels[1]} B: ${storedPixels[2]}`;
        } else {
          storedPixels = cornerstone.getStoredPixels(eventData.element, x, y, 1, 1);
          const sp = storedPixels[0];
          const mo = sp * eventData.image.slope + eventData.image.intercept;
          const suv = cornerstoneTools.calculateSUV(eventData.image, sp);

          // Draw text
          text = `${x}, ${y}`;
          str = `SP: ${sp} MO: ${parseFloat(mo.toFixed(3))}`;
          if (suv) {
            str += ` SUV: ${parseFloat(suv.toFixed(3))}`;
          }
        }

        const coords = {
          // Translate the x/y away from the cursor
          x: data.handles.end.x + 3,
          y: data.handles.end.y - 3
        };
        const textCoords = cornerstone.pixelToCanvas(eventData.element, coords);

        cornerstoneTools.drawTextBox(context, str, textCoords.x, textCoords.y + fontHeight + 5, color);
        cornerstoneTools.drawTextBox(context, text, textCoords.x, textCoords.y, color);
      }
    });
  }
}
// /////// END IMAGE RENDERING ///////

// Module exports
cornerstoneTools.aiFiducial = cornerstoneTools.mouseButtonTool({
  createNewMeasurement,
  onImageRendered,
  pointNearTool,
  toolType
});

cornerstoneTools.aiFiducialTouch = cornerstoneTools.touchTool({
  createNewMeasurement,
  onImageRendered,
  pointNearTool,
  toolType
});